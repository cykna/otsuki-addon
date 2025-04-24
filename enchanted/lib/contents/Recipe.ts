import { Jsonable } from "../types";
import { EnchantedItem } from "./Item";

export enum RecipeType {
  Furnace = "minecraft:recipe_furnace",
}


export class EnchantedRecipe implements Jsonable {
  static get result(): typeof EnchantedItem {
    throw new Error("Must implement Enchanted Recipe result on recipe named: " + this.id);
  }
  static get id() {
    return "enchanted:todo";
  }
  constructor(protected type: RecipeType) {

  }

  get tags(): string[] {
    return [];
  }

  get_json(namespace: string): any {
    throw new Error("Enchanted Recipe default 'get_json' function cannot be used");
  }
}

export interface FurnaceInputItem {
  item: typeof EnchantedItem;
  data?: number;
  count?: number;
}

export class ShapedRecipe extends EnchantedRecipe {
  private mappings = new Map<string, typeof EnchantedItem>();

  constructor() {
    super(RecipeType.Furnace);
  }

  mapping(key: string, item: typeof EnchantedItem) {
    this.mappings.set(key, item);
    return this;
  }

  get pattern(): string[] {
    return [];
  }

  get input_item(): FurnaceInputItem {
    throw new Error("Must implement input item with id: " + (this.constructor as typeof ShapedRecipe).id);
  }

  get amount() {
    return 1;
  }

  get_json(namespace: string) {
    const id = (this.constructor as typeof ShapedRecipe).id;
    const obj = {
      format_version: "1.17",
      [this.type]: {
        description: {
          identifier: namespace + ':' + id + "_shaped"
        },
        tags: this.tags,
        pattern: this.pattern,
        key: (() => {
          const out = {};
          for (const [key, item] of this.mappings) {
            out[key] = {
              item: item.id
            };
          }
          return out;
        })(),
        result: {
          item: namespace + ":" + (this.constructor as typeof EnchantedRecipe).result.id,
          count: this.amount
        }
      }
    };
    return obj;
  }
}
export enum FurnaceRecipeTag {
  Furnace = "furnace", Blast = "blast_furnace", Smoker = "smoker"
}
export class FurnaceRecipe extends EnchantedRecipe {
  constructor() {
    super(RecipeType.Furnace);
  }
  get tags(): FurnaceRecipeTag[] {
    return [];
  }
  get input_item(): FurnaceInputItem {
    throw new Error("Must implement input item with id: " + (this.constructor as typeof ShapedRecipe).id);
  }

  get_json(namespace: string) {
    const input = this.input_item;
    const id = (this.constructor as typeof FurnaceRecipe).id;
    const obj = {
      format_version: "1.17",
      [this.type]: {
        description: {
          identifier: namespace + ':' + id + "_furnace"
        },
        tags: this.tags,
        input: {
          item: namespace + ":" + input.item.id,
          count: input.count,
          data: input.data
        },
        output: namespace + ":" + (this.constructor as typeof EnchantedRecipe).result.id
      }
    };
    return obj;
  }
}
