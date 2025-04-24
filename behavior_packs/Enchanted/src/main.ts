import { world } from "@minecraft/server";
import { EnchantedServer } from "./server/server";
import { RouteServer } from "./server/routed_server";

world.afterEvents.worldLoad.subscribe(e => {
  world.setDynamicProperty(Math.random().toString(), Math.random());
})

new RouteServer({
  uuid: "enchanted",
  piece_len: 2048,
}).route("/", () => {
  world.sendMessage("Vai pro cacete");
}).route("/seugay", () => {
  world.sendMessage("É você que é");
});
