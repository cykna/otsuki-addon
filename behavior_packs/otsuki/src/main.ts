import { system, world } from "@minecraft/server";
import { EnchantedClient } from "./client/client.ts";

const client = new EnchantedClient({
  target: "enchanted",
  uuid: "seupai"
});


world.afterEvents.playerBreakBlock.subscribe(async e => {
  let i = 0;
  const now = Date.now();
  while (Date.now() - now < 1000) {
    let j = i;
    client
      .send_object({ "route": "/" })
      .then(e => world.sendMessage(j.toString()));
    i++;
  }
  console.log("Sent a total of", i, "requests");
});

