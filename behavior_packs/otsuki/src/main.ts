import { system, world } from "@minecraft/server";
import { EnchantedClient } from "./client/client";

const client = new EnchantedClient("seupai");

world.afterEvents.worldLoad.subscribe(e => {
  client.send_object({
    odeio: "esse relogio"
  });
})

