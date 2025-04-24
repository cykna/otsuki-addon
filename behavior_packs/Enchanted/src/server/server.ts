import { system, world } from "@minecraft/server";
import { compress, decompress } from "lz-string";

export interface EnchantedRequest {
  content: string;
  finalized: boolean
};

export interface ServerRequest {
  route: string;
  target_uuid: string;
}
type uuid = string;
export class EnchantedServer {
  static running_server: EnchantedServer | null = null;
  private static request_reset_index(uuid: string) {
    system.sendScriptEvent("enchanted:request_reset", uuid);
  }

  private static *send_response(req: string, target: string, id: number) {
    const compressed = compress(req);
    const header = `${target}\x01${id}\x01`;
    for (let i = 0, j = compressed.length; i < j; i += 2048) yield system.sendScriptEvent("enchanted:response_data", header + compressed.substring(i, i + Math.min(2048, j - i)));
  }

  static *handle(request: string, target: string, id: number) {
    if (this.running_server == null) throw new Error("No Server is running to send a response. Error on server implementation");

    const decompressed = decompress(request);

    yield system.sendScriptEvent("enchanted:response", target); //initializes the response caching on the client
    yield* this.send_response(this.running_server.handle_request(decompressed, target, id), target, id);
    yield system.sendScriptEvent("enchanted:response_end", `${target}\x01${id}`);

  }
  static requests: Map<uuid, EnchantedRequest[]> = new Map;

  static {
    system.afterEvents.scriptEventReceive.subscribe(e => {
      switch (e.id) {
        case 'enchanted:request': { //"/scriptevent enchanted:request uuid"
          if (this.requests.has(e.message)) {
            this.requests.get(e.message)!.push({ content: "", finalized: false });
          } else {
            this.requests.set(e.message, [{ content: "", finalized: false }]);
          }
          break;
        }
        case 'enchanted:request_data': {
          const splitted = e.message.split("\x01"); //Expects to follow the pattern uuid\1id\content
          const first = splitted[0];
          if (!this.requests.has(first)) throw new Error(`Not a recognized uuid: ${first}`);
          const idx = parseInt(splitted[1]);
          this.requests.get(first)![idx].content += splitted[2];
          break;
        }
        case 'enchanted:finalize_request': {
          const splitted = e.message.split("\x01");
          const first = splitted[0];
          const idx = parseInt(splitted[1]);
          const request = this.requests.get(first);
          if (!request) throw new Error(`Not a recognized uuid: ${first}`);
          system.runJob(EnchantedServer.handle(request[idx].content, first, idx));
          request[idx].finalized = true;
          if (request.every(e => e.finalized)) {
            this.requests.delete(first);
            this.request_reset_index(first);
          }
          break;
        }
      }
    });
  };
  constructor(public readonly uuid: string) {
    EnchantedServer.running_server = this;
  }
  handle_request(req: string, target: string, id: number) {
    return "brejo";
  }
}
