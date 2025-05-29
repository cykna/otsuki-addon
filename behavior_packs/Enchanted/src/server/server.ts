import { system, } from "@minecraft/server";
import { MessageInfo, ZethaRequest, ReceivedRequest, ServerConfig, ClientFinalizationMessage, ClientInitializationMessage, ClientPacketMessage, ClientSingleResquestMessage, RequestType, decompress, compress, ClientBatchMessage, ServerSingleResponseMessage, ServerBatchedMessage } from "../common/index.ts";
import { send_response, send_batch, send_response_blocking, send_single } from "../helpers/index.ts";
import { ZethaClient } from "../client/client.ts";



//a server can be a client as well
export class ZethaServer extends ZethaClient {

  static requests: Map<string, Map<number, ZethaRequest>> = new Map;
  config: ServerConfig;
  constructor(config: ServerConfig) {
    super(config);
  }
  send_request(req: ReceivedRequest) {
    switch (req.type) {
      case RequestType.SingleRequest: {
        this.receive_client_single(req);
        break;
      }
      case RequestType.Initialization: {
        this.receive_initialization(req);
        break;
      }
      case RequestType.PacketData: {
        this.receive_client_packet(req);
        break;
      }
      case RequestType.Finalization: {
        this.receive_client_finalization(req);
      }
    }
  }

  /**
   * A method for when this server receives a single request
   */
  public receive_client_single(req: ReceivedRequest) {
    const decompressed = decompress(req.body);
    this.handle_request(decompressed, req.client_id, req.request_index).then(res => {
      const response = compress(res);
      if (response.length > MessageInfo.SizeLimit) {
        send_response(response, req.client_id, req.request_index);
      } else {
        const server_message = new ServerSingleResponseMessage(req.client_id, req.request_index, response);
        send_single(server_message);
      }
    });
    return true;
  }
  /**
   * Server handler when asked to prepare a request with the given informations. This is not mean't to return something, but only prepare for handling packets.
   * @param req The message with client and request information
   */
  public receive_initialization(req: ReceivedRequest) {
    if (this.config.uuid != req.server_id) return false;
    const request = ZethaServer.requests.get(req.client_id);
    if (request) request.set(req.request_index, { content: [] })
    else ZethaServer.requests.set(req.client_id, new Map([[req.request_index, { content: [] }]]));
    return true;
  }

  /**
   * A server handler for when receiving a packet request. (maybe)Is not the total request body, but instead, a streammed part of it.
   * @param req The client message with the informations about the packet
   * @obs The content of the message is compressed
   */
  public receive_client_packet(req: ReceivedRequest) {
    const request = ZethaServer.requests.get(req.client_id)?.get(req.request_index);
    if (!request) throw new Error(`Not recognized client with id: ${req.client_id} with id ${req.request_index}`);
    request.content.push(req.body);
    return true;
  }

  /**
   * A server handler for when receiving a batch request. If this is received, it handles all the requests and sends back to the client immediatly.
   * Diferent of normal requests, this is expected to have a lot of requests in once, so no needs for telling when initialize or finish.
   */
  public receive_client_batch(message: ClientBatchMessage) {
    const server_message = new ServerBatchedMessage(message.client_id);
    if (this.config.block_request) this.handle_batch_blocking(message, server_message);
    else system.runJob(this.handle_batch_nonblocking(message, server_message));
  }

  /**
  * Batches an specific amount of request. It handles all of them and keeps adding on the server_message param, when it's needed to be sent, its sent.
  * As this functino does not block, it sends a batch per tick. If there are 4 batches required, is 4 ticks needed, but remember, if these responses are not big, then 1 tick can mean >100 requests.
  */
  private *handle_batch_nonblocking(message: ClientBatchMessage, server_message: ServerBatchedMessage) {
    for (const request of message.requests) {
      yield void this.handle_request(request.body, message.client_id, request.id).then(response => {
        if (response.length + server_message.len() > MessageInfo.ApproxUncompressedSize) {
          send_batch(server_message);
          server_message.reset();
        }
        server_message.add_response(response, request.id);
      });
    }
  }

  /**
  * Batches an specific amount of request. It handles all of them and keeps adding on the server_message param, when it's needed to be sent, its sent.
  * As this function does block, it can send >1 response to the client on the same tick.
  */
  public handle_batch_blocking(message: ClientBatchMessage, server_message: ServerBatchedMessage) {
    for (const request of message.requests) {
      this.handle_request(request.body, message.client_id, request.id).then(response => {
        if (response.length + server_message.len() > MessageInfo.ApproxUncompressedSize) {
          send_batch(server_message);
          server_message.reset();
        }
        server_message.add_response(response, request.id);
      });
    }
  }

  /**
   * A server handler for when an usual request is finalized and the server is asked to give it a response.
   * @param req The message sent by the client with information about the request.
   */
  public receive_client_finalization(req: ReceivedRequest) {
    const request = ZethaServer.requests.get(req.client_id);
    if (!request) throw new Error(`Not recognized client: ${req.client_id}`);

    const content = decompress(request.get(req.request_index)!.content.join(''));

    this.handle_request(content, req.client_id, req.request_index).then(response => {
      if (this.config.block_request) send_response(compress(response), req.client_id, req.request_index);
      else send_response_blocking(compress(response), req.client_id, req.request_index);
      request.delete(req.request_index);
    });
  }

  async handle_request(req: string, client: string, req_id: number) {
    const data = this.handle(JSON.parse(req), client, req_id);
    return JSON.stringify(data);
  }

  async handle(obj: any, client: string, req_id: number): Promise<any> {
    return "Todo! Zetha Server default handle function is meant to be overwritten"
  }
  listen() {
    system.afterEvents.scriptEventReceive.subscribe(e => {
      let message: any;
      switch (e.id) {
        case RequestType.Initialization: {
          message = ClientInitializationMessage.from(e.message);
          break;
        }
        case RequestType.PacketData: {
          message = ClientPacketMessage.from(e.message);
          break;
        }
        case RequestType.Finalization: {
          message = ClientFinalizationMessage.from(e.message);
          break;
        }
        case RequestType.BatchRequest: {
          const decompressed_message = decompress(e.message);
          const message = ClientBatchMessage.from(decompressed_message);
          if (message.client_id != this.config.uuid) return;
          this.receive_client_batch(message);
          return;
        }
        case RequestType.SingleRequest: {
          message = ClientSingleResquestMessage.from(e.message);
          break;
        }
        default: return;
      }
      if (message.server_id != this.config.uuid) return;
      this.send_request({
        body: message?.content ?? '',
        client_id: message.client_id,
        server_id: message.server_id,
        request_index: message.request_index,
        type: e.id as any
      });

    });


  }
}
