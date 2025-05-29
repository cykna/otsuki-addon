import { system, } from "@minecraft/server";

import { ServerBatchedMessage, ServerSingleResponseMessage, ZethaRequest, ReceivedRequest, ServerConfig, RequestType, MessageInfo, compress, decompress, ClientSingleResquestMessage, ClientInitializationMessage, ClientFinalizationMessage, ClientPacketMessage, ClientBatchMessage } from "../common/index.ts";
import { channel, ChannelSender, ChannelReceiver, send_single, send_batch, send_response_blocking, send_response } from "../helpers/index.ts"
import { ZethaClient } from "../client/client.ts";

//a server can be a client as well
export class QueuedZethaServer extends ZethaClient {

  static requests: Map<string, Map<number, ZethaRequest>> = new Map;
  config: ServerConfig;
  /**
   * The channel writer to send data about the received request.
   */
  tx: ChannelSender<ReceivedRequest>;
  /**
   * The channel reader to receive data about the received request.
   */
  rx: ChannelReceiver<ReceivedRequest>;
  constructor(config: ServerConfig) {
    super(config);
    const [tx, rx] = channel<ReceivedRequest>();
    this.tx = tx;
    this.rx = rx;
  }

  async *[Symbol.asyncIterator]() {
    yield* this.rx;
  }
  /**
   * Queues the given request on this server. Awaits for all the others before the given to be resolved, then, it starts to run. If you want something where the order does not matter,
   * and without the need to await, use ZethaServer instead.
   */
  public send_request(req: ReceivedRequest) {
    this.tx.send(req);
  }


  /**
   * A server handler for when receiving a batch request. If this is received, it handles all the requests and sends back to the client immediatly.
   * Diferent of normal requests, this is expected to have a lot of requests in once, so no needs for telling when initialize or finish.
   */
  public receive_client_batch(message: ClientBatchMessage) {
    const server_message = new ServerBatchedMessage(message.client_id);
    if (this.config.block_request) this.handle_batch_blocking(message, server_message);
    else system.runJob(this.handle_batch_nonblocking(message, server_message))
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

  async handle_request(req: string, client: string, req_id: number) {
    const data = this.handle(JSON.parse(req), client, req_id);
    return data.then(JSON.stringify);
  }

  async handle(obj: any, client: string, req_id: number): Promise<any> {
    return "Todo! Zetha server dsefault handle function is meant to be overwritten"
  }

  protected handle_initialization(req: ReceivedRequest) {
    const request = QueuedZethaServer.requests.get(req.client_id);
    if (request) request.set(req.request_index, { content: [] })
    else QueuedZethaServer.requests.set(req.client_id, new Map([[req.request_index, { content: [] }]]));
  }

  protected async handle_finalization(req: ReceivedRequest) {
    const request = QueuedZethaServer.requests.get(req.client_id);
    if (!request) throw new Error(`Not recognized client: ${req.client_id}`);

    const data = compress(await this.handle_request(decompress(request.get(req.request_index)!.content.join('')), req.client_id, req.request_index));

    if (this.config.block_request) send_response_blocking(data, req.client_id, req.request_index);
    else send_response(data, req.client_id, req.request_index);

    request.delete(req.request_index);

  }

  protected async handle_single_req(req: ReceivedRequest) {
    const response = compress(await this.handle_request(decompress(req.body), req.client_id, req.request_index));
    if (response.length > MessageInfo.SizeLimit) send_response(response, req.client_id, req.request_index);
    else send_single(new ServerSingleResponseMessage(req.client_id, req.request_index, response));
  }

  protected handle_packet(req: ReceivedRequest) {
    const request = QueuedZethaServer.requests.get(req.client_id)?.get(req.request_index);
    if (!request) throw new Error(`Not recognized client with id: ${req.client_id} with id ${req.request_index}`);
    request.content.push(req.body);
  }

  private initialize() {
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
  /**
  * Initializes the server and starts receiving requests. If some request is given before this, the data is simply lost.
  */
  async listen() {
    this.initialize();
    for await (const req of this.rx) {
      switch (req.type) {
        case RequestType.SingleRequest: {
          await this.handle_single_req(req);
          break;
        }
        case RequestType.Initialization: {
          this.handle_initialization(req);
          break;
        }
        case RequestType.Finalization: {
          await this.handle_finalization(req);
          break;
        }
        case RequestType.PacketData: {
          this.handle_packet(req);
          break;
        }
        case RequestType.BatchRequest: {
          throw new Error("A Batch request should not be avaible in this method.");
        }
      }
    }
  }
}
