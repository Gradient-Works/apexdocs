import DocsProcessor from './DocsProcessor';
import DocsifyDocsProcessor from './DocsifyDocsProcessor';
import JekyllDocsProcessor from './JekyllDocsProcessor';

export default class Settings {
  private static instance: Settings;

  private desiredScope: string[] = ['global', 'public'];
  private outputDir: string = 'docs';
  private generator: string = 'jekyll';
  private configPath: string | null = null;
  private shouldGroup: boolean | null = true;

  private constructor() {}

  static getInstance(): Settings {
    if (!Settings.instance) {
      Settings.instance = new Settings();
    }

    return Settings.instance;
  }

  setScope(desiredScope: string[]) {
    this.desiredScope = desiredScope;
  }

  getScope() {
    return this.desiredScope;
  }

  setOutputDir(outputDir: string) {
    this.outputDir = outputDir;
  }

  getOutputDir() {
    return this.outputDir;
  }

  setGenerator(generator: string) {
    this.generator = generator;
  }

  getDocsProcessor(): DocsProcessor {
    if (this.generator === 'jekyll') {
      return new JekyllDocsProcessor();
    }

    return new DocsifyDocsProcessor();
  }

  setConfigPath(configPath: string) {
    this.configPath = configPath;
  }

  getConfigPath() {
    return this.configPath;
  }

  setShouldGroup(shouldGroup: boolean) {
    this.shouldGroup = shouldGroup;
  }

  getShouldGroup() {
    return this.shouldGroup;
  }
}
