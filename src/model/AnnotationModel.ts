export default class AnnotationModel {
  private name: string;
  private modifiers: Map<string, string>;

  constructor(name: string, modifiers: Map<string, string>) {
    this.name = name;
    this.modifiers = modifiers;
  }

  getName() {
    return this.name;
  }

  getModifiers() {
    return this.modifiers;
  }

  getModifier(name: string): string {
    return this.modifiers.get(name) || '';
  }
}
