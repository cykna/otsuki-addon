import { world } from "@minecraft/server";
import { EnchantedServer } from "./server/server";
import { RouteServer } from "./server/routed_server";


new RouteServer({
  uuid: "enchanted",
  piece_len: 2048,
}).route("/", () => {
  return "hello world";
}).route("/seugay", (content) => 24).route("/peloamor", () => 69);
