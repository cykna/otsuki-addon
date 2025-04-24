import { EnchantedItem } from "../lib/contents/Item";
import { ModuleDependency } from "../lib/contents/manifest";
import { EnchantedProject, EnchantedProjectBuildOptions, EnchantedProjectOptions } from "../lib/Enchanted";
import { XiliumCore, XiliumDust, XiliumIngot, XiliumIngotRecipe, XiliumPlate } from "./materials/xilium";

class OtsukiProject extends EnchantedProject {
  constructor() {
    super(
      new EnchantedProjectOptions()
        .with_version([1, 0, 0])
        .with_name("Otsuki")
        .with_description("made by quriosen")
        .require_script(true)
        .with_dependencies(ModuleDependency.server('2.0.0-beta'))
        .with_namespace('otsuki'),
      new EnchantedProjectBuildOptions(),
      "otsuki"
    );
  }
}

export function main() {
  const otsuki = new OtsukiProject();
  otsuki
    .register_item(new XiliumDust)
    .register_item(new XiliumPlate)
    .register_item(new XiliumIngot)
    .register_recipe(new XiliumIngotRecipe)
    .register_item(new XiliumCore);
  otsuki.create_project(false);
}
