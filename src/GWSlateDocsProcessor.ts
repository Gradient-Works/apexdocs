import * as fs from 'fs';
import * as path from 'path';

import MarkdownHelper from './MarkdownHelper';
import ClassModel from './model/ClassModel';
import PropertyModel from './model/PropertyModel';
import DocsProcessor from './DocsProcessor';

export default class GWSlateDocsProcessor extends DocsProcessor {
  private classes: ClassModel[] = [];
  private generators: Map<string, MarkdownHelper> = new Map<string, MarkdownHelper>();

  public onBeforeProcess(classes: ClassModel[], outputDir: string) {
    this.classes = classes;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    this.getGenerator('actions').addTitle('Actions', 1);
    this.getGenerator('models').addTitle('Models', 1);
  }

  private getGenerator(type: string): MarkdownHelper {
    let gen = this.generators.get(type);
    if (gen == null) {
      gen = new MarkdownHelper(this.classes);
      this.generators.set(type, gen);
    }
    return gen;
  }

  process(classModel: ClassModel, outputDir: string) {
    const level = 1;
    if (classModel.getClassName().endsWith('Action')) {
      const gen = this.getGenerator('actions');
      gen.addBlankLine();
      this.generateActionDocs(gen, classModel, 2);
    } else {
      const gen = this.getGenerator('models');
      gen.addBlankLine();
      this.generateModelDocs(gen, classModel, 2);
    }
    // tslint:disable-next-line:no-console
    console.log(`${classModel.getClassName()} processed.`);
  }

  public onAfterProcess(classes: ClassModel[], outputDir: string) {
    this.generators.forEach((generator, name) => {
      const filePath = path.join(outputDir, `_${name}.md`);
      fs.writeFile(filePath, generator.contents, 'utf8', () => {
        // tslint:disable-next-line:no-console
        console.log(`${name} data written to ${filePath}`);
      });
    });
  }

  private generateModelDocs(generator: MarkdownHelper, classModel: ClassModel, level: number) {
    generator.addTitle(classModel.getClassName(), level);

    if (classModel.getDescription()) {
      generator.addText(classModel.getDescription());
    }

    const properties = classModel
      .getProperties()
      .filter(p => p.getScope() === 'global')
      .sort((a, b) => a.getPropertyName().localeCompare(b.getPropertyName()));

    if (properties.length > 0) {
      generator.addTitle('Properties', level + 1);
      this.addPropertyTable(generator, properties);
    }
  }

  private generateActionDocs(generator: MarkdownHelper, classModel: ClassModel, level: number) {
    const execute = classModel.getMethods().find(m => m.getMethodName() === 'execute');
    const invocableMethod = execute?.getAnnotations().find(a => a.getName() === 'InvocableMethod');

    const title = invocableMethod?.getModifier('label') || classModel.getClassName();
    generator.addTitle(title, level);

    if (classModel.getDescription()) {
      generator.addText(classModel.getDescription().trim());
    }

    const reqClass = classModel.getChildClasses().find(c => c.getClassName().includes('Request'));
    if (reqClass) {
      generator.addBlankLine();
      generator.addTitle('Inputs', level + 1);
      generator.addText(reqClass.getDescription());
      const properties = reqClass
        .getProperties()
        .filter(p => {
          return p.getScope() === 'global' && p.getAnnotations().some(a => a.getName() === 'InvocableVariable');
        })
        .sort((propA, propB) => {
          const ivA = propA.getAnnotations().find(a => a.getName() === 'InvocableVariable');
          const ivB = propB.getAnnotations().find(a => a.getName() === 'InvocableVariable');
          const aIsRequired = ivA?.getModifier('required') === 'true' ? 1 : 0;
          const bIsRequired = ivB?.getModifier('required') === 'true' ? 1 : 0;
          // Sort required first
          let comp = bIsRequired - aIsRequired;
          if (comp === 0) {
            comp = propA.getPropertyName().localeCompare(propB.getPropertyName());
          }
          return comp;
        });

      if (properties.length > 0) {
        const columns = ['Name', 'Required', 'Type', 'Description'];
        generator.addText(columns.join('|'));
        generator.addText(columns.map(col => '-'.repeat(col.length)).join('|'));
        properties.forEach(prop => {
          const iv = prop.getAnnotations().find(a => a.getName() === 'InvocableVariable');
          const row = [
            prop.getPropertyName(),
            iv?.getModifier('required') === 'true' ? 'Yes' : 'No',
            prop.getReturnType(),
            prop.getDescription(),
          ];
          generator.addText(row.join('|'));
        });
      }
    }

    const resultClass = classModel.getChildClasses().find(c => c.getClassName().includes('Result'));
    if (resultClass) {
      generator.addBlankLine();
      generator.addTitle('Outputs', level + 1);
      generator.addText(resultClass.getDescription());
      const properties = resultClass
        .getProperties()
        .filter(p => {
          return p.getScope() === 'global' && p.getAnnotations().some(a => a.getName() === 'InvocableVariable');
        })
        .sort((a, b) => a.getPropertyName().localeCompare(b.getPropertyName()));
      if (properties.length > 0) {
        this.addPropertyTable(generator, properties);
      }
    }
  }

  private addPropertyTable(generator: MarkdownHelper, properties: Array<PropertyModel>) {
    const columns = ['Name', 'Type', 'Description'];
    generator.addText(columns.join('|'));
    generator.addText(columns.map(col => '-'.repeat(col.length)).join('|'));
    properties.forEach(prop => {
      const row = [prop.getPropertyName(), prop.getReturnType(), prop.getDescription()];
      generator.addText(row.join('|'));
    });
  }
}
