export interface ManifestHeader {
  name: string,
  description: string,
  uuid: string,
  version: [number, number, number],
  min_engine_version: [number, number, number],
}

export enum ManifestModuleType {
  Behavior = "data",
  Resource = "resources",
  Script = "script"
}

export enum AddonCapability {
  Eval = "eval"
}

export interface ManifestModule {
  type: ManifestModuleType,
  language?: string;
  entry?: string;
  uuid: string;
  description: string;
  version: [number, number, number]
}

export interface ManifestDependency {
  uuid?: string;
  module_name?: string;
  version?: string;
}

export interface AddonManifest {
  format_version: number;
  header: ManifestHeader;
  modules: ManifestModule[],
  capabilities: AddonCapability[],
  dependencies: ManifestDependency[]
}

export class AddonDependency implements ManifestDependency {
  uuid: string;
  module_name?: string | undefined = undefined;
  version?: string | undefined = undefined;
  constructor(target: string) {
    this.uuid = target;
  }
}
export class ModuleDependency implements ManifestDependency {

  static server(version: string) {
    return new this("@minecraft/server", version);
  }
  static ui(version: string) {
    return new this("@minecraft/server-ui", version);
  }

  uuid?: string = undefined;
  module_name: string;
  version: string;
  private constructor(target: string, version: string) {
    this.module_name = target;
    this.version = version;
  }
}
