import { ButtonState, InputButton, world } from "@minecraft/server";
import { EnchantedClient } from "./client/client.ts";

const client = new EnchantedClient({
  target: "cycro:zetha_server",
  uuid: "cycro:otsuki_client"
});

world.afterEvents.playerButtonInput.subscribe(async e => {
  if (e.button == InputButton.Sneak && e.newButtonState == ButtonState.Released) {
    try {
      const result = await client.send_object({
        route: "/example/suamae",
        content: 12
      }, {
        blocks: true,
        batch: false
      });
      console.log(JSON.stringify(result.body));
    } catch (e) {
      console.log("Deu erro hein", e.body);
    }
    console.log(world.getDynamicProperty("suamae") ?? "deu ruim irmão, não existe nesse addon");

  }
})


