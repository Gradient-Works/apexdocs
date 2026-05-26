import * as fs from 'fs';
import * as path from 'path';

import ClassModel from './model/ClassModel';
import PropertyModel from './model/PropertyModel';
import DocsProcessor from './DocsProcessor';

const CATEGORY_ORDER = [
  'Queues',
  'Matching',
  'Flows',
  'Next Steps',
  'Collections',
  'Dynamic Books',
  'Users',
  'Logs',
  'Events',
  'Leads',
  'Assign',
  'Notifications',
  'Utils',
];

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Queues: 'Actions for enqueueing records and assigning items to users via Gradient Works queues.',
  Matching: 'Actions for matching leads to accounts, contacts, and other leads.',
  Flows:
    'Flow lifecycle and subflow execution actions. Place Start at the top and Finish at the bottom of every flow to enable execution tracing. Use Execute Subflow to dynamically invoke a subflow or to run subflows in scheduled paths where the native Subflow element does not work.',
  'Next Steps':
    'Post-assignment actions: creating tasks, enrolling prospects in cadences, sending Slack or email notifications.',
  Collections:
    'Utility actions for building and querying data structures: record maps, SOQL queries, and text collections.',
  'Dynamic Books': 'Actions for checking account eligibility against target books and triggering retrievals.',
  Users: 'Actions for reading and updating rep capacity and weight on a Gradient Works queue.',
  Logs: 'Actions for writing messages to Gradient Works Log Entries, useful for debugging flow executions.',
  Events: 'Actions for handling Gradient Works platform events.',
  Leads: 'Actions for converting leads.',
  Assign: 'Direct assignment actions.',
  Notifications: 'Actions for sending assignment notifications.',
  Utils: 'Utility actions for miscellaneous flow operations.',
};

// SF standard objects and primitives — don't try to expand these
const PRIMITIVE_TYPES = new Set([
  'String',
  'Integer',
  'Long',
  'Boolean',
  'Id',
  'Double',
  'Decimal',
  'Date',
  'Datetime',
  'SObject',
  'Object',
  'void',
  'Account',
  'Lead',
  'Contact',
  'Opportunity',
  'Task',
  'Campaign',
  'CampaignMember',
  'User',
  'Group',
  'CalendarEvent__c',
]);

function isPrimitive(type: string): boolean {
  const base = type.replace(/^List<(.+)>$/, '$1').trim();
  return PRIMITIVE_TYPES.has(base);
}

function baseType(type: string): string {
  return type.replace(/^List<(.+)>$/, '$1').trim();
}

function categorySlug(category: string): string {
  return category.toLowerCase().replace(/\s+/g, '-');
}

function getActionLabel(classModel: ClassModel): string {
  const invocableMethod = classModel
    .getMethods()
    .flatMap((m) => m.getAnnotations())
    .find((a) => a.getName() === 'InvocableMethod');
  return invocableMethod?.getModifier('label') || '';
}

function parseCategory(label: string): [string, string] {
  const match = label.match(/^(.*?)\s*:\s*(.+)$/);
  if (match) return [match[1].trim(), match[2].trim()];
  return ['', label];
}

function getPropDescription(prop: PropertyModel): string {
  const iv = prop.getAnnotations().find((a) => a.getName() === 'InvocableVariable');
  const ae = prop.getAnnotations().find((a) => a.getName() === 'AuraEnabled');
  return (iv?.getModifier('description') || ae?.getModifier('description') || prop.getDescription() || '')
    .replace(/\n/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
}

function renderTypeExpansion(typeName: string, typeRegistry: Map<string, ClassModel>, indent: string = ''): string {
  const model = typeRegistry.get(typeName);
  if (!model) return '';

  const desc = model.getDescription().trim();
  const props = model
    .getProperties()
    .filter((p) =>
      p.getAnnotations().some((a) => a.getName() === 'AuraEnabled' || a.getName() === 'InvocableVariable'),
    );

  if (props.length === 0) return '';

  const lines: string[] = [];
  lines.push(`${indent}**\`${typeName}\` fields:**`);
  if (desc) lines.push(`${indent}${desc}`);
  lines.push('');
  lines.push(`${indent}| Field | Type | Description |`);
  lines.push(`${indent}|-------|------|-------------|`);
  for (const prop of props) {
    const fieldDesc = getPropDescription(prop);
    lines.push(`${indent}| \`${prop.getPropertyName()}\` | \`${prop.getReturnType()}\` | ${fieldDesc} |`);
  }

  return lines.join('\n') + '\n';
}

function renderPropertyTable(
  properties: ReturnType<ClassModel['getProperties']>,
  showRequired: boolean,
  typeRegistry: Map<string, ClassModel>,
): string {
  if (properties.length === 0) return '_None._\n';

  const header = showRequired ? '| Field | Type | Required | Description |' : '| Field | Type | Description |';
  const sep = showRequired ? '|-------|------|----------|-------------|' : '|-------|------|-------------|';

  const rows = properties.map((prop) => {
    const iv = prop.getAnnotations().find((a) => a.getName() === 'InvocableVariable');
    const desc = getPropDescription(prop);
    const type = prop.getReturnType();
    const name = prop.getPropertyName();
    if (showRequired) {
      const req = iv?.getModifier('required') === 'true' ? 'Yes' : 'No';
      return `| \`${name}\` | \`${type}\` | ${req} | ${desc} |`;
    }
    return `| \`${name}\` | \`${type}\` | ${desc} |`;
  });

  const lines = [header, sep, ...rows];

  // Expand complex output types inline (outputs only — showRequired=false)
  if (!showRequired) {
    const expandedTypes = new Set<string>();
    for (const prop of properties) {
      const bt = baseType(prop.getReturnType());
      if (!isPrimitive(prop.getReturnType()) && !expandedTypes.has(bt) && typeRegistry.has(bt)) {
        expandedTypes.add(bt);
        const expansion = renderTypeExpansion(bt, typeRegistry);
        if (expansion) lines.push('', expansion.trimEnd());
      }
    }
  }

  return lines.join('\n') + '\n';
}

function renderAction(classModel: ClassModel, actionName: string, typeRegistry: Map<string, ClassModel>): string {
  const lines: string[] = [`## ${actionName}`, ''];

  lines.push(`**Action class:** \`${classModel.getClassName()}\``, '');

  const fullDesc = classModel.getDescription().trim();
  // Strip any @preamble / @end-preamble block — that content is hoisted to the category header.
  const desc = fullDesc.replace(/@preamble\n[\s\S]*?@end-preamble\n?/g, '').trim();
  if (desc) lines.push(desc, '');

  const reqClass = classModel.getChildClasses().find((c) => c.getClassName().includes('Request'));
  const inputs = (reqClass?.getProperties() ?? [])
    .filter((p) => {
      if (!p.getAnnotations().some((a) => a.getName() === 'InvocableVariable')) return false;
      const d = (
        p
          .getAnnotations()
          .find((a) => a.getName() === 'InvocableVariable')
          ?.getModifier('description') ||
        p.getDescription() ||
        ''
      ).trim();
      return !d.toLowerCase().startsWith('deprecated');
    })
    .sort((a, b) => {
      const aReq =
        a
          .getAnnotations()
          .find((x) => x.getName() === 'InvocableVariable')
          ?.getModifier('required') === 'true'
          ? 1
          : 0;
      const bReq =
        b
          .getAnnotations()
          .find((x) => x.getName() === 'InvocableVariable')
          ?.getModifier('required') === 'true'
          ? 1
          : 0;
      if (bReq !== aReq) return bReq - aReq;
      return a.getPropertyName().localeCompare(b.getPropertyName());
    });

  lines.push('### Inputs', '');
  lines.push(renderPropertyTable(inputs, true, typeRegistry));

  const resultClass = classModel.getChildClasses().find((c) => c.getClassName().includes('Result'));
  const outputs = (resultClass?.getProperties() ?? [])
    .filter((p) => p.getAnnotations().some((a) => a.getName() === 'InvocableVariable'))
    .sort((a, b) => a.getPropertyName().localeCompare(b.getPropertyName()));

  lines.push('### Outputs', '');
  lines.push(renderPropertyTable(outputs, false, typeRegistry));

  return lines.join('\n');
}

export default class GWMCPDocsProcessor extends DocsProcessor {
  private byCategory: Map<string, Array<[ClassModel, string]>> = new Map();
  private typeRegistry: Map<string, ClassModel> = new Map();
  private preambleRegistry: Map<string, string> = new Map();

  public onBeforeProcess(_classes: ClassModel[], outputDir: string) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  process(classModel: ClassModel, _outputDir: string) {
    const label = getActionLabel(classModel);

    if (label) {
      // Skip deprecated actions
      if (classModel.getDescription().trim().toLowerCase().startsWith('deprecated')) {
        return;
      }

      // It's an invocable action — file under its category
      const [category, actionName] = parseCategory(label);
      if (category) {
        if (!this.byCategory.has(category)) {
          this.byCategory.set(category, []);
        }
        this.byCategory.get(category)!.push([classModel, actionName]);
      }

      // Action classes can carry a category preamble via @preamble / @end-preamble in their description
      const preambleMatch = classModel.getDescription().match(/@preamble\n([\s\S]*?)@end-preamble/);
      if (preambleMatch && category) {
        this.preambleRegistry.set(category, preambleMatch[1].trim());
      }
    } else {
      // Non-action classes register as a category preamble if they have a @group matching a known category
      const group = classModel.getClassGroup();
      if (group && CATEGORY_ORDER.includes(group)) {
        this.preambleRegistry.set(group, classModel.getDescription().trim());
      }
      // Register as a type if it has @AuraEnabled properties
      const hasAuraEnabledProps = classModel
        .getProperties()
        .some((p) => p.getAnnotations().some((a) => a.getName() === 'AuraEnabled'));
      if (hasAuraEnabledProps) {
        this.typeRegistry.set(classModel.getClassName(), classModel);
      }
    }
  }

  public onAfterProcess(_classes: ClassModel[], outputDir: string) {
    const written: string[] = [];

    const allCategories = [
      ...CATEGORY_ORDER.filter((c) => this.byCategory.has(c)),
      ...[...this.byCategory.keys()].filter((c) => !CATEGORY_ORDER.includes(c)),
    ];

    for (const category of allCategories) {
      const actions = this.byCategory.get(category)!;
      actions.sort(([, a], [, b]) => a.localeCompare(b));

      const lines: string[] = [`# ${category}`, ''];
      const catDesc = CATEGORY_DESCRIPTIONS[category];
      if (catDesc) lines.push(catDesc, '');

      const preamble = this.preambleRegistry.get(category);
      if (preamble) {
        lines.push(preamble, '');
        lines.push('---', '');
      }

      for (const [classModel, actionName] of actions) {
        lines.push(renderAction(classModel, actionName, this.typeRegistry));
        lines.push('---', '');
      }

      const slug = categorySlug(category);
      const filePath = path.join(outputDir, `${slug}.md`);
      fs.writeFileSync(filePath, lines.join('\n').trimEnd() + '\n', 'utf8');
      written.push(filePath);
      // tslint:disable-next-line:no-console
      console.log(`Written: ${filePath}`);
    }

    // tslint:disable-next-line:no-console
    console.log('\nAdd to llms.txt under ## Salesforce Flow Actions:');
    for (const category of allCategories) {
      const slug = categorySlug(category);
      // tslint:disable-next-line:no-console
      console.log(
        `- [${category} actions](https://agents.gradient.works/docs/flow-actions/${slug}.md): GW invocable action reference for the ${category} category`,
      );
    }
  }
}
