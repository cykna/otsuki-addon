import { system } from "@minecraft/server";
import { ClientPacketMessage, ClientInitializationMessage, ClientFinalizationMessage, ClientBatchMessage, ClientSingleResquestMessage } from "../common/messages/client.ts";
import { ServerPacketMessage, ServerFinalizeMessage, ServerBatchedMessage, ServerSingleResponseMessage } from "../common/messages/server.ts"
import { RequestType, ResponseType } from "../common/types.ts";
import { ResponseData, ClientConfig, RequestConfig, default_request_config } from "../common/typings/client.ts"
import { RequestConstants } from "../common/constants.ts";
import { compress, decompress } from "../common/compression/index.ts";
import { ResponseCode } from "../common/Response.ts";
import { murmurhash3_32_gc } from "../common/helpers/murmurhash.ts";

/**
 * Returns a client id. Is not meant to be readable, but used when passing data between addons
 */
function client_id(id: string) {
  const hash = murmurhash3_32_gc(id);
  return String.fromCharCode((hash >>> 16) & 0xffff, hash & 0xffff);
}
/**
 * Creates a new EnchantedClient. The uuid is an uuid that is static and not expected to be changed. Preferly it's better to use the uuid of the behavior pack itself
 */
export class EnchantedClient {
  protected batch_message: ClientBatchMessage;
  protected request_idx = 1;
  //Awaiting promises. In case the responses
  protected responses: Map<number, ResponseData> = new Map;

  constructor(protected readonly config: ClientConfig) {
    this.config.uuid = client_id(config.uuid);
    if (this.config.target) this.config.target = client_id(this.config.target);
    this.batch_message = new ClientBatchMessage(config.uuid, config.target!);
    system.afterEvents.scriptEventReceive.subscribe(e => {
      switch (e.id) {
        case ResponseType.PacketData: {
          const server_message = new ServerPacketMessage('', 0, '');
          server_message.decode(e.message);
          this.receive_packet(server_message);
          break;
        }
        case ResponseType.Finalization: {
          const message = new ServerFinalizeMessage('', 0);
          message.decode(e.message);
          this.receive_finalization(message);
          break;
        }
        case ResponseType.BatchResponse: {
          const message = new ServerBatchedMessage('');
          const decompressed = decompress(e.message);
          message.decode(decompressed);
          this.receive_batch(message);
        }
        case ResponseType.SingleResponse: {
          const message = new ServerSingleResponseMessage('', 0, '');
          message.decode(e.message);
          this.receive_single(message);
        }
      }
    });
  }

  /**
   * A handler for when this client receives a single scriptEvent call response.
   */
  protected receive_single(message: ServerSingleResponseMessage) {
    if (message.client_id != this.config.uuid) return false;
    const res = this.responses.get(message.request_index);
    if (!res) return false;
    const body = decompress(message.content);
    res.ok(body);
    this.responses.delete(message.request_index);
    this.handle_response(body, message.request_index);
    return true;
  }

  /**
   * A handler for when this client receives a batched response
   */
  protected receive_batch(message: ServerBatchedMessage) {
    if (message.client_id != this.config.uuid) return false;
    for (const response of message.responses) {
      const res = this.responses.get(response.id);
      if (!res) continue;
      res.ok(response.body);
      this.responses.delete(response.id);
      this.handle_response(response.body, response.id);
    }
    return true;
  }
  /**
   * A handler for when this client receives some packet from the server. If overrided, recommended to still execute the default one.
   */
  protected receive_packet(message: ServerPacketMessage): boolean {
    if (message.target != this.config.uuid) return false;
    this.responses.get(message.response_index)!.body.push(message.content);
    return true;
  }

  protected handle_indexed_response(index: number) {
    const res = this.responses.get(index);
    if (!res) return;
    const decompressed = decompress(res.body.join(""));
    res.ok(decompressed);
    this.responses.delete(index);
    this.handle_response(decompressed, index);
  }
  /**
   * A handler for when this clients receives a request finalization message. This is executed before the promise resolving of the request and the handle_response /**
    */
  protected receive_finalization(message: ServerFinalizeMessage) {
    if (message.target != this.config.uuid) return false;
    this.handle_indexed_response(message.response_index);
    return true;
  }

  /**
   * Sends a message to the server saying this client is going to emit a request.
   */
  protected initialize_request() {
    const message = new ClientInitializationMessage(this.config.uuid, this.config.target!, this.request_idx);
    system.sendScriptEvent(RequestType.Initialization, message.encode());
  }
  /**
  * Sends the given content to the server with the uuid that matches this client config target. It streams the data across multiple scriptEvents if the content compressed is >2048chars, but sends them all in the current tick
  * The formula to calculate the amount of scriptevents will be sent is 2 + ceil(N / 2048). N is the length in chars of the content compressed.. 2 is because of 1 from initializing and another 1 from finishing
  */
  private *make_request_nonblocking(content: string) {

    const compressed = compress(content);
    const id = this.request_idx;

    this.initialize_request();
    const message = new ClientPacketMessage(this.config.target!, this.config.uuid, '', this.request_idx);
    this.request_idx = (this.request_idx + 1) % RequestConstants.REQUEST_AMOUNT_LIMIT;
    for (let i = 0, j = compressed.length; i < j;) {
      message.content = compressed.substring(i, i += RequestConstants.SIZE_LIMIT);
      yield system.sendScriptEvent(RequestType.PacketData, message.encode());
    }
    this.finalize_request(id);

  }

  /**
   * A single request is a request that needs only 1 scriptEvent call. It's better for requests that the body size is known to be <2kb.
   * So there's no need to initialize on server, stream and finalize, which would cost at least 3 scripEvent call
   */
  private make_single_request(content: string) {
    const message = new ClientSingleResquestMessage(this.config.uuid, this.config.target!, this.request_idx);
    message.content = compress(content);
    console.log('Oh o conteúdo:', content);
    console.log('Oh o conteúdo comprimido:', message.encode(), this.request_idx);
    system.sendScriptEvent(RequestType.SingleRequest, message.encode());
    this.request_idx = (this.request_idx + 1) % RequestConstants.REQUEST_AMOUNT_LIMIT;
  }
  /**
   * Sends the given content to the server with the uuid that matches this client config target. It streams the data across multiple scriptEvents if the content compressed is >2048chars, but sends them all in the current tick
   * The formula to calculate the amount of scriptevents will be sent is 2 + ceil(N / 2048). N is the length in chars of the content compressed.. 2 is because of 1 from initializing and another 1 from finishing
   */
  private make_request_blocking(content: string) {

    const compressed = compress(content);
    const id = this.request_idx;

    this.initialize_request();
    const message = new ClientPacketMessage(this.config.target!, this.config.uuid, '', this.request_idx);
    this.request_idx = (this.request_idx + 1) % RequestConstants.REQUEST_AMOUNT_LIMIT;
    for (let i = 0, j = compressed.length; i < j;) {
      message.content = compressed.substring(i, i += RequestConstants.SIZE_LIMIT);
      system.sendScriptEvent(RequestType.PacketData, message.encode());
    }
    this.finalize_request(id);
  }

  /**
   * Sends a message to the server telling the request that was being sent finalized, so it can process it.
   * @param id The id of the request to be processed by the server
   */
  private finalize_request(id: number) {
    const message = new ClientFinalizationMessage(this.config.uuid, this.config.target!, id).encode();
    system.sendScriptEvent(RequestType.Finalization, message);
  }

  /**
   * This is expected to send a lot of requests on a single scriptEvent call, so theres no need to a nonblocking variant.
   */
  private batch_request() {
    const encoded = this.batch_message.encode();
    const compressed = compress(encoded);
    system.sendScriptEvent(RequestType.BatchRequest, compressed);
  }

  private make_batch_request(data: string): Promise<string> {
    if (this.batch_message.len() + data.length + 1 < RequestConstants.APPROXIMATED_UNCOMPRESSED_LIMIT) {
      this.batch_message.add_request(data, this.request_idx);
      return new Promise((ok, _) => {
        this.responses.set(this.request_idx, { ok, body: [] });
        this.request_idx = (this.request_idx + 1) % RequestConstants.REQUEST_AMOUNT_LIMIT;
      });
    } else {
      this.batch_request();
      this.batch_message.clear();
      this.batch_message.add_request(data, this.request_idx);
      return new Promise((ok, _) => {
        this.responses.set(this.request_idx, { ok, body: [] });
        this.request_idx = (this.request_idx + 1) % RequestConstants.REQUEST_AMOUNT_LIMIT;
      })
    }
  }

  /**
  * compress the given data and requests it to Enchanted Server target.
  * */
  send_raw(data: string, config: RequestConfig): Promise<string> {

    if (!this.config.target) return new Promise((_, err) => err(new Error("Client does not have a target")));
    if (config.batch) return this.make_batch_request(data);
    return new Promise((ok, _) => {
      this.responses.set(this.request_idx, { ok, body: [] });
      if (data.length > RequestConstants.APPROXIMATED_UNCOMPRESSED_LIMIT) {
        if (config.blocks) this.make_request_blocking(data);
        else this.make_request_nonblocking(data);
      }
      else {
        this.make_single_request(data);
      }
    });
  }

  /**
   * Converts the given object and sends it to the server. The server must implement that object request type
   */
  async send_object(obj: object, config: RequestConfig = default_request_config()) {
    const raw = JSON.parse(await this.send_raw(JSON.stringify(obj), config));
    if (raw.code == ResponseCode.Success) return raw;
    else throw raw;
  }

  /**
  * Handler of responses when some arrives. By default does not do anything, so it's meant to be overrided
  * @param content The stringfied response received from the serve
  * @param id The id of the response, same as the request
  */
  handle_response(content: string, id: number) {
  }
}
