import { EnchantedItem } from "../../lib/contents/Item";
import { FurnaceInputItem, FurnaceRecipe, FurnaceRecipeTag } from "../../lib/contents/Recipe";

export class XiliumDust extends EnchantedItem {
  static get id() {
    return "xilium_dust";
  }
  get texture_path(): string {
    return "textures/items/xilium_dust"
  }
  get name() {
    return "Xilium Dust"
  }
}

export class XiliumPlate extends EnchantedItem {
  static get id() {
    return "xilium_plate";
  }
  get texture_path(): string {
    return "textures/items/xilium_plate";
  }
  get name() {
    return "Xilium Plate";
  }
}

export class XiliumIngot extends EnchantedItem {
  static get id() {
    return "xilium_ingot";
  }
  get texture_path() {
    return "textures/items/xilium_ingot";
  }
  get name() {
    return "Xilium Ingot";
  }
}

export class XiliumIngotRecipe extends FurnaceRecipe {
  static get result() {
    return XiliumIngot;
  }
  static get id() {
    return "xilium_ingot";
  }

  get tags(): FurnaceRecipeTag[] {
    return [FurnaceRecipeTag.Furnace, FurnaceRecipeTag.Blast];
  }
  get input_item(): FurnaceInputItem {
    return {
      item: XiliumDust
    }
  }
}

export class XiliumCore extends EnchantedItem {
  static get id(): string {
    return "xilium_core";
  }
  get texture_path() {
    return "textures/items/xilium_core";
  }
  get name() {
    return "§dXilium Core";
  }
}
