import { system } from "@minecraft/server";
import { EnchantedServer } from "./server";

export function ImplEnchantedServer<T extends typeof EnchantedServer>(constructor: T) {
  system.afterEvents.scriptEventReceive.subscribe(e => {
    switch (e.id) {
      case 'enchanted:request': { //"/scriptevent enchanted:request uuid"
        const split = e.message.split('\x01');
        if (split[1] == constructor.running_server?.config.uuid)
          if (constructor.requests.has(split[0])) {
            constructor.requests.get(split[0])!.push({ content: "", finalized: false });
          } else {
            constructor.requests.set(split[0], [{ content: "", finalized: false }]);
          }
        break;
      }
      case 'enchanted:request_data': {
        const splitted = e.message.split("\x01"); //Expects to follow the pattern uuid\1target\1id\content
        if (splitted[1] != constructor.running_server?.config.uuid) return;
        const first = splitted[0];
        if (!constructor.requests.has(first)) throw new Error(`Not a recognized uuid: ${first}`);
        if (constructor.running_server?.config.uuid != splitted[1]) break;
        const idx = parseInt(splitted[2]);
        constructor.requests.get(first)![idx].content += splitted[3];
        break;
      }
      case 'enchanted:finalize_request': {
        const splitted = e.message.split("\x01");
        if (constructor.running_server?.config.uuid != splitted[1]) return;
        const first = splitted[0];
        const idx = parseInt(splitted[2]);
        const request = constructor.requests.get(first);
        if (!request) throw new Error(`Not a recognized uuid: ${first}`);
        system.runJob(constructor.handle(request[idx].content, first, idx));
        request[idx].finalized = true;
        if (request.every(e => e.finalized)) {
          constructor.requests.delete(first);
          constructor.request_reset_index(first);
        }
        break;
      }
    }
  });

}
