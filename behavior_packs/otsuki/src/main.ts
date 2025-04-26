import { system, world } from "@minecraft/server";
import { EnchantedClient } from "./client/client.ts";

const client = new EnchantedClient({
  target: "enchanted",
  piece_len: 2048,
  uuid: "seupai",
  batch_request: true
});


world.afterEvents.playerBreakBlock.subscribe(async e => {
  let i = 0;
  const now = Date.now();
  while (Date.now() - now < 1000) {
    client.send_object({ "route": "/" }).then(e => world.sendMessage("Oi" + i));
    i++;
  }
  console.log("Sent a total of", i, "requests");
});

