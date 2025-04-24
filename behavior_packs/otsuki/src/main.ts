import { system, world } from "@minecraft/server";
import { EnchantedClient } from "./client/client";

const client = new EnchantedClient({
  target: "enchanted",
  piece_len: 2048,
  uuid: "seupai"
});

world.afterEvents.worldLoad.subscribe(e => {
  client.send_object({
    route: "/",
  });
})

world.afterEvents.playerBreakBlock.subscribe(e => {
  client.send_object({
    route: "/peloamor",
    content: {
      seu: "corno"
    }
  }).then(e => console.log(JSON.stringify(e)));
})
