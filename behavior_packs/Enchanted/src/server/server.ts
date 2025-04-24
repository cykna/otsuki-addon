import { system, world } from "@minecraft/server";
import { compress, decompress } from "lz-string";
import { ImplEnchantedServer } from "./decorators";
import { EnchantedClient, RequestConfig } from "../client/client";

export interface EnchantedRequest {
  content: string;
  finalized: boolean
};

type uuid = string;

@ImplEnchantedServer
export class EnchantedServer extends EnchantedClient {
  static running_server: EnchantedServer | null = null;

  static request_reset_index(uuid: string) {
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

  constructor(config: RequestConfig) {
    super(config);
    EnchantedServer.running_server = this;
  }
  handle_request(req: string, client: string, req_id: number) {
    const data = this.handle(JSON.parse(req), client, req_id);
    return JSON.stringify(data);
  }
  handle(obj: any, client: string, req_id: number): any {
    return "Todo! Enchanted Server default handle function is meant to be overwritten"
  }
}
