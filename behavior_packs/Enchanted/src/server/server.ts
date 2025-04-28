import { system, } from "@minecraft/server";
import { ClientConfig } from "../common/typings/client.ts";
import { ClientFinalizationMessage, ClientInitializationMessage, ClientPacketMessage } from "../common/messages/client.ts"
import { RequestType } from "../common/types.ts";
import { send_batch, send_response, send_response_blocking } from "./internals.ts";
import { compress, decompress } from "lz-string";
import { ClientBatchMessage } from "../common/messages/client.ts";
import { ServerBatchedMessage } from "../common/messages/server.ts";
import { RequestConstants } from "../common/constants.ts";
import { EnchantedClient } from "../client/client.ts";
import { EnchantedRequest } from "../common/typings/server.ts";


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

export interface ServerConfig extends ClientConfig {
  block_request: boolean;
}
//a server can be a client as well
export class EnchantedServer extends EnchantedClient {
  static running_server: EnchantedServer | null = null;

  static requests: Map<string, Map<number, EnchantedRequest>> = new Map;
  config: ServerConfig;
  constructor(config: ServerConfig) {
    super(config);
    EnchantedServer.running_server ??= this;
  }

  /**
   * Server handler wen asked to prepare a request. If the target id doesn't match with this server id, nothing happens.
   * @param message The message with client and request information
   */
  public receive_initialization(message: ClientInitializationMessage) {
    if (this.config.uuid != message.server_id) return false;
    const request = EnchantedServer.requests.get(message.client_id);
    if (request) request.set(message.request_index, { content: '' })
    else EnchantedServer.requests.set(message.client_id, new Map([[message.request_index, { content: '' }]]));
    return true;
  }

  /**
   * A server handler for when receiving a packet request. (maybe)Is not the total request body, but instead, a streammed part of it.
   * @param message The client message with the informations about the packet
   * @obs The content of the message is compressed
   */
  public receive_client_packet(message: ClientPacketMessage) {
    if (message.server_id != this.config.uuid) return false;
    const request = EnchantedServer.requests.get(message.client_id);
    if (!request) throw new Error(`Not recognized client: ${message.client_id}`);
    request.get(message.request_index)!.content += message.content;
    return true;
  }

  /**
   * A server handler for when receiving a batch request. If this is received, it handles all the requests and sends back to the client immediatly.
   * Diferent of normal requests, this is expected to have a lot of requests in once, so no needs for telling when initialize or finish.
   */
  public receive_client_batch(message: ClientBatchMessage) {
    if (message.server_id != this.config.uuid) return false;
    const server_message = new ServerBatchedMessage(message.client_id);
    if (this.config.block_request) this.handle_batch_blocking(message, server_message);
    else system.runJob(this.handle_batch_nonblocking(message, server_message))
    return true;
  }

  /**
  * Batches an specific amount of request. It handles all of them and keeps adding on the server_message param, when it's needed to be sent, its sent.
  * As this functino does not block, it sends a batch per tick. If there are 4 batches required, is 4 ticks needed, but remember, if these responses are not big, then 1 tick can mean >100 requests.
  */
  private *handle_batch_nonblocking(message: ClientBatchMessage, server_message: ServerBatchedMessage) {
    for (const request of message.requests) {
      const response = this.handle_request(request.body, message.client_id, request.id);
      if (response.length + server_message.len() > RequestConstants.APPROXIMATED_UNCOMPRESSED_LIMIT) {
        yield send_batch(server_message);
        server_message.reset();
      }
      server_message.add_response(response, request.id);
    }
  }

  /**
  * Batches an specific amount of request. It handles all of them and keeps adding on the server_message param, when it's needed to be sent, its sent.
  * As this function does block, it can send >1 response to the client on the same tick.
  */
  public handle_batch_blocking(message: ClientBatchMessage, server_message: ServerBatchedMessage) {
    for (const request of message.requests) {
      const response = this.handle_request(request.body, message.client_id, request.id);
      if (response.length + server_message.len() > RequestConstants.APPROXIMATED_UNCOMPRESSED_LIMIT) {
        send_batch(server_message);
        server_message.reset();
      }
      server_message.add_response(response, request.id);
    }
  }

  /**
   * A server handler for when an usual request is finalized and the server is asked to give it a response.
   * @param message The message sent by the client with information about the request.
   */
  public receive_client_finalization(message: ClientFinalizationMessage) {
    if (this.config.uuid != message.server_id) return false;
    const request = EnchantedServer.requests.get(message.client_id);
    if (!request) throw new Error(`Not recognized client: ${message.client_id}`);

    const content = decompress(request.get(message.request_index)!.content);

    const response = this.handle_request(content, message.client_id, message.request_index);
    if (this.config.block_request) send_response(compress(response), message.client_id, message.request_index);
    else send_response_blocking(compress(response), message.client_id, message.request_index);

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
