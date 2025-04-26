import { system, } from "@minecraft/server";
import { EnchantedClient, RequestConfig } from "../client/client";
import { ClientFinalizationMessage, ClientInitializationMessage, ClientPacketMessage } from "../client/message.ts"
import { RequestType, ResponseType } from "../common/types.ts";
import { send_batch, send_response, send_response_blocking } from "./internals.ts";
import { compress, decompress } from "lz-string";
import { ClientBatchMessage } from "../../../otsuki/src/client/message.ts";
import { ServerBatchedMessage } from "./message.ts";
import { RequestConstants } from "../common/constants.ts";

export interface EnchantedRequest {
  content: string;
};

system.afterEvents.scriptEventReceive.subscribe(e => {
  if (!EnchantedServer.running_server) return;

  switch (e.id) {
    case RequestType.Initialization: {
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
    case RequestType.BatchRequest: {
      const decompressed_message = decompress(e.message);
      const message = new ClientBatchMessage('', '');
      message.decode(decompressed_message);
      EnchantedServer.running_server.receive_client_batch(message);
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
    if (request) request.set(message.request_index, { content: '' })
    else EnchantedServer.requests.set(message.client_id, new Map([[message.request_index, { content: '' }]]));
    return true;
  }

  public receive_client_packet(message: ClientPacketMessage) {
    if (message.server_id != this.config.uuid) return false;
    const request = EnchantedServer.requests.get(message.client_id);
    if (!request) throw new Error(`Not recognized client: ${message.client_id}`);
    request.get(message.request_index)!.content += message.content;

    return true;
  }


  public receive_client_batch(message: ClientBatchMessage) {
    if (message.server_id != this.config.uuid) return false;
    const batch_message = new ServerBatchedMessage(message.client_id);
    for (const request of message.requests) {
      const response = this.handle_request(request.body, message.client_id, request.id);
      if (response.length + batch_message.len() > RequestConstants.APPROXIMATED_UNCOMPRESSED_LIMIT) {
        send_batch(batch_message);
        batch_message.reset();
      }
      batch_message.add_response(response, request.id);
    }
  }

  public receive_client_finalization(message: ClientFinalizationMessage) {
    if (this.config.uuid != message.server_id) return false;
    const request = EnchantedServer.requests.get(message.client_id);
    if (!request) throw new Error(`Not recognized client: ${message.client_id}`);

    const content = decompress(request.get(message.request_index)!.content);

    const response = this.handle_request(content, message.client_id, message.request_index);

    send_response_blocking(compress(response), message.client_id, message.request_index);

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
