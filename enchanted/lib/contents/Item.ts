import { Jsonable } from "../types";


export interface DescriptionCategory {
  group: string;
  category: string;
}

export interface ItemDescription {
  identifier: string;
  menu_category: DescriptionCategory;
}

export interface AddonItem {
  format_version: string;
  "minecraft:item": {
    description: ItemDescription;
    components: Record<string, any>;
  }
}

export interface UsableItem {
  on_use(): void;
  on_stop_use(): void;
}
export interface MeleeItem {
  on_hit_entity(): void;
  on_hit_block?(): void;
}

export enum ItemCategory {
  Equipment = "equipment",
  Construction = "construction",
  Items = "items",
  Nature = "nature"
}
export enum ItemEnchantmentSlot {
  Sword = "sword",
  Boots = "armor_feet",
  Leggings = "armor_legs",
  Chestplate = "armor_torso",
  Head = "armor_head"
}
export class EnchantedItem implements Jsonable {

  static get id() {
    return "enchanted:default";
  }

  constructor() { }

  get category() {
    return ItemCategory.Items;
  }

  get texture_path() {
    return "textures/items/diamond";
  }

  get durability() {
    return 0;
  }

  get max_stack_size() {
    return 0;
  }

  get enchantability() {
    return 0;
  }

  get enchantment_slot() {
    return ItemEnchantmentSlot.Sword;
  }

  get glints() {
    return false;
  }

  get name() {
    return "You gotta give this item a name"
  }

  get group() {
    return "";
  }
  get_json(namespace: string): any {
    const components = {} as Record<string, any>;
    if (this.texture_path) {
      components['minecraft:icon'] = (this.constructor as typeof EnchantedItem).id;
    };
    if (this.max_stack_size != 0) components['minecraft:max_stack_size'] = this.max_stack_size;
    if (this.durability != 0) components['minecraft:durability'] = {
      max_durability: this.durability
    };
    if (this.name) components['minecraft:display_name'] = {
      value: this.name
    }
    if (this.glints) components['minecraft:foil'] = true;
    if (this.enchantability != 0) components['minecraft:enchantable'] = {
      slot: this.enchantment_slot,
      enchantability: this.enchantability
    };
    const category = {
      category: this.category
    };
    if (this.group) (category as any).group = this.group;
    const obj: AddonItem = {
      format_version: "1.21.70",
      "minecraft:item": {
        description: {
          identifier: namespace + ":" + (this.constructor as typeof EnchantedItem).id,
          menu_category: category as any
        },
        components
      }
    };
    return obj;
  }
}
export class Enchanted3DItem extends EnchantedItem {
  geometries: Record<string, string> = {};
  textures: Record<string, string> = {};
  materials: Record<string, string> = {};
  render_controllers: string[] = [];
  scripts: Record<string, string> = {};

  with_geometry(name: string, geometry_name: string) {
    this.geometries[name] = geometry_name;
    return this;
  }

  with_3d_texture(name: string, texture_name: string) {
    this.textures[name] = texture_name;
    return this;
  }

  with_material(name: string, material_name: string) {
    this.materials[name] = material_name;
    return this;
  }

  with_render_controllers(...controllers: string[]) {
    this.render_controllers.push(...controllers);
  }

  with_script(name: string, value: string) {
    this.scripts[name] = value;
    return this;
  }
}

export enum ArmorType {
  Helmet = "slot.armor.head",
  Chestplate = "slot.armor.chest",
  Leggings = "slot.armor.legs",
  Boots = "slot.armor.feet"
}

export class EnchantedArmorItem extends Enchanted3DItem implements Jsonable {
  constructor(public readonly slot: ArmorType, public readonly defense: number) {
    super();
    switch (slot) {
      case ArmorType.Helmet: {
        this
          .with_geometry("default", "geometry.humanoid.armor.helmet")
          .with_script('parent_setup', 'variable.helmet_layer_visible = 0.0;');
        break;
      }
      case ArmorType.Chestplate: {
        this
          .with_geometry("default", "geometry.humanoid.armor.chestplate")
          .with_script('parent_setup', 'variable.chest_layer_visible = 0.0;');
        break;
      }
      case ArmorType.Leggings: {
        this
          .with_geometry("default", "geometry.humanoid.armor.leggings")
          .with_script('parent_setup', 'variable.leg_layer_visible = 0.0;');
        break;
      }
      case ArmorType.Boots: {
        this
          .with_geometry("default", "geometry.humanoid.armor.boots")
          .with_script('parent_setup', 'variable.boot_layer_visible = 0.0;');
        break;
      }
    }
    this
      .with_material("default", "armor")
      .with_material("enchanted", "armor_enchanted")
      .with_3d_texture("enchanted", "textures/misc/enchanted_this_glint")
      .with_render_controllers("controller.render.armor");
  }

  with_armor_texture(txt: string) {
    this.with_3d_texture("default", txt);
    return this;
  }
  get_json(namespace: string) {
    const obj = super.get_json(namespace);
    obj['minecraft:item'].components['minecraft:wearable'] = {
      protection: this.defense,
      slot: this.slot
    }
    return obj;
  }
}

export class EnchantedHelmet extends EnchantedArmorItem {

  constructor(public readonly defense: number) {
    super(ArmorType.Helmet, defense);
  }

}

export class EnchantedChestplate extends EnchantedArmorItem {

  constructor(public readonly defense: number) {
    super(ArmorType.Chestplate, defense);
  }

}

export class EnchantedLeggings extends EnchantedArmorItem {

  constructor(public readonly defense: number) {
    super(ArmorType.Leggings, defense);
  }

}

export class EnchantedBoots extends EnchantedArmorItem {

  constructor(public readonly defense: number) {
    super(ArmorType.Boots, defense);
  }

}
