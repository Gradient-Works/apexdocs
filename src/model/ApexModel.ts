import Settings from '../Settings';
import AnnotationModel from '../model/AnnotationModel';

export default class ApexModel {
  protected nameLine: string = '';
  private nameLineIndex: number | undefined;
  private description: string = '';
  private author: string = '';
  private date: string = '';
  private returns: string = '';
  private example: string = '';
  private scope: string = '';
  private isNamespaceAccessible: boolean = false;
  private annotations: Array<AnnotationModel> = [];

  getNameLine() {
    return this.nameLine;
  }

  getInameLine() {
    return this.nameLineIndex;
  }

  setNameLine(nameLine: string, iLine: number) {
    this.nameLine = nameLine.trim();
    this.nameLineIndex = iLine;
    this.parseScope();
  }

  getDescription() {
    return this.description == null ? '' : this.description;
  }

  setDescription(description: string) {
    this.description = description;
  }

  getAuthor() {
    return this.author == null ? '' : this.author;
  }

  setAuthor(author: string) {
    this.author = author;
  }

  getDate() {
    return this.date == null ? '' : this.date;
  }

  setDate(date: string) {
    this.date = date;
  }

  getReturns() {
    return this.returns == null ? '' : this.returns;
  }

  setReturns(returns: string) {
    this.returns = returns;
  }

  getExample() {
    return this.example == null ? '' : this.example;
  }

  setExample(example: string) {
    this.example = example;
  }

  getScope() {
    return this.scope == null ? '' : this.scope;
  }

  setScope(scope: string) {
    this.scope = scope;
  }

  setIsNamespaceAccessible(isNamespaceAccessible: boolean) {
    this.isNamespaceAccessible = isNamespaceAccessible;
  }

  getIsNamespaceAccessible() {
    return this.isNamespaceAccessible;
  }

  setAnnotations(annotations: Array<AnnotationModel>) {
    // Make a copy
    this.annotations = [...annotations];
  }

  getAnnotations() {
    return this.annotations;
  }

  private parseScope() {
    this.scope = '';
    const str = this.getScopeFromSettings(this.nameLine);
    if (str != null) {
      this.scope = str;
    }
  }

  private getScopeFromSettings(str: string) {
    str = str.toLowerCase();
    for (const currentScope of Settings.getInstance().getScope()) {
      if (str.toLowerCase().includes(currentScope.toLowerCase() + ' ')) {
        return currentScope;
      }
    }

    return null;
  }
}
