import { Molang } from "../types";

export interface AttachableData {
  identifier: string;
  materials: Record<string, string>;
  textures: Record<string, string>;
  geometry: Record<string, string>;
  scripts: {
    parent_setup?: Molang;
  }
  render_controllers: string[]
}

export interface ItemAttachable {
  format_version: string;
  "minecraft:attachable": {
    description: AttachableData
  }
}
