import { ButtonState, InputButton, world } from "@minecraft/server";
import { EnchantedClient } from "./client/client.ts";

const client = new EnchantedClient({
  target: "cycro:zetha_server",
  uuid: "cycro:otsuki_client"
});

world.afterEvents.playerButtonInput.subscribe(e => {
  if (e.button == InputButton.Sneak && e.newButtonState == ButtonState.Released) {
    client.send_object({
      route: "/example"
    }, {
      blocks: true,
      batch: false
    });
  }
})


