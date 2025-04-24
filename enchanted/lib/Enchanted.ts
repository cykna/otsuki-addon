import { randomUUIDv7 } from "bun";
import { AddonCapability, AddonManifest, ManifestDependency, ManifestModule, ManifestModuleType } from "./contents/manifest";
import { AddonItem, Enchanted3DItem, EnchantedArmorItem, EnchantedItem } from "./contents/Item";
import { AttachableData, ItemAttachable } from "./contents/Attachable";
import { EnchantedRecipe } from "./contents/Recipe";
import { Jsonable } from "./types";

export interface ItemTextures {
  resource_pack_name: string,
  texture_name: "atlas.items",
  texture_data: ItemTexturesData
}
export interface ItemTexturesData {
  [name: string]: {
    textures: string
  }
}

export class EnchantedProjectOptions {
  capabilities: AddonCapability[] = [];
  dependencies: ManifestDependency[] = [];
  name = "Enchanted Project";
  requires_script = false;
  description = "Made with Enchanted Library";
  namespace = "enchanted";
  version: [number, number, number] = [1, 0, 0];
  constructor() { }
  with_name(name: string) {
    this.name = name;
    return this;
  }
  require_script(flag: boolean) {
    this.requires_script = flag;
    return this;
  }
  with_version(version: [number, number, number]) {
    this.version = version;
    return this;
  }
  with_description(desc: string) {
    this.description = desc;
    return this;
  }
  with_dependencies(...dependency: ManifestDependency[]) {
    this.dependencies.push(...dependency);
    return this;
  }
  with_capabilities(...capabilities: AddonCapability[]) {
    this.capabilities.push(...capabilities);
    return this;
  }
  with_namespace(namespace: string) {
    this.namespace = namespace;
    return this;
  }
}

export class EnchantedProjectBuildOptions {
  log_modifications = true;
  contents_minified = false;
  indent_level = 4;
  constructor() { }
  with_modifications(flag: boolean) {
    this.log_modifications = flag;
    return this;
  }
  with_minified(flag: boolean) {
    this.contents_minified = flag;
    return this;
  }
  with_identation_level(n: number) {
    this.indent_level = n;
    return this;
  }
}

export class EnchantedProject {

  private behdir: string;
  private resdir: string;

  private registered_items: Set<EnchantedItem> = new Set;
  private registered_recipes: Set<EnchantedRecipe> = new Set;

  constructor(private options: EnchantedProjectOptions, private build_configs: EnchantedProjectBuildOptions, outdir: string) {
    const main = Bun.main.split('/');
    main.splice(main.length - 3);
    const concat = main.join('/');

    this.behdir = concat + `/behavior_packs/${outdir}/`;
    this.resdir = concat + `/resource_packs/${outdir}/`;
  }

  register_item<T extends EnchantedItem>(item: T) {
    this.registered_items.add(item);
    return this;
  }
  register_recipe<T extends EnchantedRecipe & Jsonable>(recipe: T) {
    this.registered_recipes.add(recipe);
    return this;
  }



  beh_file(name: string) {
    return Bun.file(this.beh_path_to(name + ".json"));
  }

  beh_script_file(name: string) {
    return Bun.file(this.beh_path_to("scripts/" + name + ".js"));
  }

  async write_res_object<O extends Object>(path: string, content: O) {
    return this.write_res(path, this.build_configs.contents_minified ? JSON.stringify(content) : JSON.stringify(content, null, this.build_configs.indent_level));
  }

  async write_beh_object<O extends Object>(path: string, content: O) {
    return this.write_beh(path, this.build_configs.contents_minified ? JSON.stringify(content) : JSON.stringify(content, null, this.build_configs.indent_level));
  }

  async write_res(path: string, content: string) {
    return Bun.write(this.res_path_to(path), content).then(e => this.build_configs.log_modifications ? (console.log(`Wrote Resource Pack content at file ${path}`), e) : e);
  }

  async write_beh(path: string, content: string) {
    return Bun.write(this.beh_path_to(path), content).then(e => this.build_configs.log_modifications ? (console.log(`Wrote Behavior Pack content at file ${path}`), e) : e);
  }

  res_path_to(path: string) {
    return this.resdir + path + ".json";
  }
  beh_path_to(path: string) {
    return this.behdir + path + ".json";
  }

  async create_manifests(should_overwrite: boolean, uuids?: [string, string]) {
    if (should_overwrite) {
      let behuuid: string;
      uuid: {
        if (uuids?.length) {
          behuuid = uuids[0];
          break uuid;
        }
        const behfile = this.beh_file("manifest");
        if (!await behfile.exists()) {
          behuuid = randomUUIDv7();
          break uuid;
        }
        const filejson = await behfile.json();
        behuuid = filejson.header.uuid;
      };
      let resuuid: string;
      uuid: {
        if (uuids?.length && uuids.length > 1) {
          resuuid = uuids[1];
          break uuid;
        }
        const behfile = this.beh_file("manifest");
        if (!await behfile.exists()) {
          resuuid = randomUUIDv7();
          break uuid;
        }
        const data = await behfile.json();
        resuuid = data.header.uuid;
      };
      const modules = [
        {
          uuid: randomUUIDv7(),
          description: "Made with Enchanted, by Quriosen",
          type: ManifestModuleType.Behavior,
          version: [1, 0, 0]
        } as ManifestModule];
      if (this.options.requires_script) {
        modules.push({
          uuid: randomUUIDv7(),
          description: "Made with Enchanted, by Quriosen",
          type: ManifestModuleType.Script,
          language: 'javascript',
          entry: 'scripts/main.js',
          version: [1, 0, 0]
        });
      }
      const beh: AddonManifest = {
        format_version: 2,
        header: {
          name: this.options.name,
          description: this.options.description,
          uuid: behuuid,
          version: this.options.version,
          min_engine_version: [1, 21, 70],
        },
        modules,
        dependencies: this.options.dependencies,
        capabilities: this.options.capabilities
      };
      const res: AddonManifest = {
        format_version: 2,
        header: {
          name: this.options.name,
          description: this.options.description,
          uuid: resuuid,
          version: this.options.version,
          min_engine_version: [1, 21, 70],
        },
        modules: [{
          uuid: randomUUIDv7(),
          type: ManifestModuleType.Resource,
          description: "Made with Enchanted, by Quriosen",
          version: [1, 0, 0]
        }],
        dependencies: [],
        capabilities: []
      }
      this.write_res_object("manifest", res);
      this.write_beh_object("manifest", beh);
      return;
    }
    else if (await Bun.file(this.beh_path_to("manifest")).exists() && await Bun.file(this.res_path_to("manifest")).exists()) return;
    else return this.create_manifests(true);
  }

  async create_item_attachable(item: Enchanted3DItem) {
    const attachable: ItemAttachable = {
      format_version: '1.12.0',
      'minecraft:attachable': {
        description: {
          identifier: this.options.namespace + ":" + (item.constructor as typeof Enchanted3DItem).id,
          materials: item.materials,
          geometry: item.geometries,
          textures: item.textures,
          scripts: item.scripts,
          render_controllers: item.render_controllers
        }
      }
    }
    return this.write_res_object(`attachables/${(item.constructor as typeof Enchanted3DItem).id}`, attachable);
  }

  async create_item_texture(data: ItemTexturesData) {
    const texture: ItemTextures = {
      texture_name: 'atlas.items',
      resource_pack_name: this.options.name,
      texture_data: data
    };
    return this.write_res_object("textures/item_texture", texture);
  }

  create_items(item_textures: ItemTexturesData) {
    for (const item of this.registered_items) {
      const json = item.get_json(this.options.namespace);
      item_textures[(item.constructor as typeof Enchanted3DItem).id] = {
        textures: item.texture_path
      };
      if (item instanceof Enchanted3DItem) this.create_item_attachable(item);
      this.write_beh_object(`items/${(item.constructor as typeof Enchanted3DItem).id}`, json);
    }
  }
  async create_recipes() {
    for await (const recipe of this.registered_recipes) {
      const json = recipe.get_json(this.options.namespace);
      this.write_beh_object(`recipes/${(recipe.constructor as typeof EnchantedRecipe).id}`, json);
    }
  }
  async create_project(overwrite = false) {
    console.log(`Initializing Project compilation at ${new Date}`);
    await this.create_manifests(overwrite);
    const item_textures = {};
    this.create_items(item_textures);
    await this.create_item_texture(item_textures);
    await this.create_recipes();
    console.log(`Finished Project compilation at ${new Date}`);
  }
}
