import { system } from "@minecraft/server";
import { EnchantedServer } from "./server";

export function ImplEnchantedServer<T extends typeof EnchantedServer>(constructor: T) {
  system.afterEvents.scriptEventReceive.subscribe(e => {
    switch (e.id) {
      case 'enchanted:request': { //"/scriptevent enchanted:request uuid"
        if (constructor.requests.has(e.message)) {
          constructor.requests.get(e.message)!.push({ content: "", finalized: false });
        } else {
          constructor.requests.set(e.message, [{ content: "", finalized: false }]);
        }
        break;
      }
      case 'enchanted:request_data': {
        const splitted = e.message.split("\x01"); //Expects to follow the pattern uuid\1id\content
        const first = splitted[0];
        if (!constructor.requests.has(first)) throw new Error(`Not a recognized uuid: ${first}`);
        const idx = parseInt(splitted[1]);
        constructor.requests.get(first)![idx].content += splitted[2];
        break;
      }
      case 'enchanted:finalize_request': {
        const splitted = e.message.split("\x01");
        const first = splitted[0];
        const idx = parseInt(splitted[1]);
        const request = this.requests.get(first);
        if (!request) throw new Error(`Not a recognized uuid: ${first}`);
        system.runJob(constructor.handle(request[idx].content, first, idx));
        request[idx].finalized = true;
        if (request.every(e => e.finalized)) {
          this.requests.delete(first);
          this.request_reset_index(first);
        }
        break;
      }
    }
  });

}
