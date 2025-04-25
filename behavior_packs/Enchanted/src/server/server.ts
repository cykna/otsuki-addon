import { system, } from "@minecraft/server";
import { EnchantedClient, RequestConfig } from "../client/client";
import { ClientFinalizationMessage, ClientInitializationMessage, ClientPacketMessage } from "../client/message.ts"
import { RequestType } from "../common/types.ts";
import { send_response } from "./internals.ts";
import { compress, decompress } from "lz-string";

export interface EnchantedRequest {
  content: string;
};

system.afterEvents.scriptEventReceive.subscribe(e => {
  if (!EnchantedServer.running_server) return;
  switch (e.id) {
    case RequestType.Initialization: { //"/scriptevent enchanted:request uuid"
      const message = new ClientInitializationMessage('', '', 0);
      message.decode(e.message);
      EnchantedServer.running_server.receive_initialization(message);
      break;
    }
    case RequestType.PacketData: {
      const message = new ClientPacketMessage('', '', '', 0);
      message.decode(e.message);
      EnchantedServer.running_server.receive_client_packet(message);
      break;
    }
    case RequestType.Finalization: {
      const message = new ClientFinalizationMessage('', '', 0);
      message.decode(e.message);
      EnchantedServer.running_server.receive_client_finalization(message);
      break;
    }
  }
});

export class EnchantedServer extends EnchantedClient {
  static running_server: EnchantedServer | null = null;

  static requests: Map<string, Map<number, EnchantedRequest>> = new Map;

  constructor(config: RequestConfig) {
    super(config);
    EnchantedServer.running_server ??= this;
  }
  public receive_initialization(message: ClientInitializationMessage) {
    if (this.config.uuid != message.server_id) return false;
    const request = EnchantedServer.requests.get(message.client_id);
    if (request) request.set(message.id, { content: '' })
    else EnchantedServer.requests.set(message.client_id, new Map([[message.id, { content: '' }]]));
    return true;
  }
  public receive_client_packet(message: ClientPacketMessage) {
    if (message.server_id != this.config.uuid) return false;
    const request = EnchantedServer.requests.get(message.client_id);
    if (!request) throw new Error(`Not recognized client: ${message.client_id}`);
    request.get(message.request_index)!.content += message.content;
    return true;

  }

  public receive_client_finalization(message: ClientFinalizationMessage) {
    if (this.config.uuid != message.server_id) return false;
    const request = EnchantedServer.requests.get(message.client_id);
    if (!request) throw new Error(`Not recognized client: ${message.client_id}`);

    const content = decompress(request.get(message.request_index)!.content);
    const response = this.handle_request(content, message.client_id, message.request_index);

    const stream = send_response(compress(response), message.client_id, message.request_index);

    system.runJob(stream);
    request.delete(message.request_index);
    return true;
  }

  handle_request(req: string, client: string, req_id: number) {
    const data = this.handle(JSON.parse(req), client, req_id);
    return JSON.stringify(data);
  }

  handle(obj: any, client: string, req_id: number): any {
    return "Todo! Enchanted Server default handle function is meant to be overwritten"
  }
}
