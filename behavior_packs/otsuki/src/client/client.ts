import { system, world, } from "@minecraft/server";
import { compress, decompress } from "lz-string";
import { ClientPacketMessage, ClientInitializationMessage, ClientFinalizationMessage, ClientBatchMessage } from "./message.ts";
import { ServerPacketMessage, ServerFinalizeMessage, ServerBatchedMessage } from "../server/message.ts";
import { RequestType, ResponseType } from "../common/types.ts";
import { RequestConstants } from "../common/constants.ts";


export interface RequestConfig {
  piece_len: number;
  batch_request?: boolean;
  bacth_response?: boolean;
  target?: string;
  uuid: string;
}
export interface ResponseData {
  body: string;
  ok(value: string): any;
}
/**
 * Creates a new EnchantedClient. The uuid is an uuid that is static and not expected to be changed. Preferly it's better to use the uuid of the behavior pack itself
 */
export class EnchantedClient {
  protected batch_message: ClientBatchMessage;
  protected request_idx = 0;
  //Awaiting promises. In case the responses
  protected responses: Map<number, ResponseData> = new Map;

  constructor(protected readonly config: RequestConfig) {
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
      }
    });
  }

  protected receive_batch(message: ServerBatchedMessage) {
    if (message.client_id != this.config.uuid) return false;
    for (const response of message.responses) {
      const res = this.responses.get(response.id);
      if (!res) return;
      res.ok(response.body);
      this.responses.delete(response.id);
      this.handle_response(response.body, response.id);
    }
  }

  /**
   * A handler for when this client receives some packet from the server. If overrided, recommended to still execute the default one.
   */
  protected receive_packet(message: ServerPacketMessage): boolean {
    if (message.target != this.config.uuid) return false;
    this.responses.get(message.response_index)!.body += message.content;
    return true;
  }

  protected handle_indexed_response(index: number) {
    const res = this.responses.get(index);
    if (!res) return;
    const decompressed = decompress(res.body);
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

  protected initialize_request() {
    const message = new ClientInitializationMessage(this.config.uuid, this.config.target!, this.request_idx);
    system.sendScriptEvent(RequestType.Initialization, message.encode());
  }
  /**
  * Sends the given content to Enchanted Server splitting its contents. Its a generator due to runJob
  * Spltilen must be <=2048, or else it will be truncated. The limit of system scriptEventReceive message is 2048
  */
  private *make_request(content: string) {

    const splitlen = Math.min(this.config.piece_len, RequestConstants.SIZE_LIMIT);
    const compressed = compress(content);
    const id = this.request_idx;

    this.initialize_request();
    const message = new ClientPacketMessage(this.config.target!, this.config.uuid, '', this.request_idx);
    this.request_idx = (this.request_idx + 1) % RequestConstants.REQUEST_AMOUNT_LIMIT;
    for (let i = 0, j = compressed.length; i < j;) {
      message.content = compressed.substring(i, i += splitlen);
      yield system.sendScriptEvent(RequestType.PacketData, message.encode());
    }
    this.finalize_request(id);

  }

  /**
   * Does the same as make_request but blocks the client thread
   */
  private make_request_blocking(content: string) {

    const splitlen = Math.min(this.config.piece_len, RequestConstants.SIZE_LIMIT);
    const compressed = compress(content);
    const id = this.request_idx;

    this.initialize_request();
    const message = new ClientPacketMessage(this.config.target!, this.config.uuid, '', this.request_idx);
    this.request_idx = (this.request_idx + 1) % RequestConstants.REQUEST_AMOUNT_LIMIT;
    for (let i = 0, j = compressed.length; i < j;) {
      message.content = compressed.substring(i, i += splitlen);
      system.sendScriptEvent(RequestType.PacketData, message.encode());
    }
    this.finalize_request(id);
  }

  private finalize_request(id: number) {
    const message = new ClientFinalizationMessage(this.config.uuid, this.config.target!, id).encode();
    system.sendScriptEvent(RequestType.Finalization, message);
  }

  private batch_requests_blocking() {
    const encoded = this.batch_message.encode();
    const compressed = compress(encoded);
    system.sendScriptEvent(RequestType.BatchRequest, compressed);
  }

  /**
  * Compress the given data and requests it to Enchanted Server target.  Parts len is the length of each piece of data. 2048 is the max
  */
  send_raw(data: string): Promise<string> {
    if (!this.config.target) return new Promise((_, err) => err(new Error("Client does not have a target")));
    if (this.config.batch_request) {
      if (this.batch_message.len() + data.length + 1 < RequestConstants.APPROXIMATED_UNCOMPRESSED_LIMIT) {
        this.batch_message.add_request(data, this.request_idx);
        return new Promise((ok, _) => {
          this.responses.set(this.request_idx, { ok, body: '' });
          this.request_idx = (this.request_idx + 1) % RequestConstants.REQUEST_AMOUNT_LIMIT;
        });
      } else {
        this.batch_requests_blocking();
        this.batch_message.clear();
        this.batch_message.add_request(data, this.request_idx);
        return new Promise((ok, _) => {
          this.responses.set(this.request_idx, { ok, body: '' });
          this.request_idx = (this.request_idx + 1) % RequestConstants.REQUEST_AMOUNT_LIMIT;
        })
      }
    }
    return new Promise((ok, _) => {
      this.responses.set(this.request_idx, { ok, body: '' });
      this.make_request_blocking(data);
    });
  }

  /**
   * Converts the given object and sends it to the server. The server must implement that object request type
   */
  async send_object(obj: object) {
    return JSON.parse(await this.send_raw(JSON.stringify(obj)));
  }

  /**
  * Handler of responses when some arrives. By default does not do anything, so it's meant to be overrided
  * @param content The stringfied response received from the serve
  * @param id The id of the response, same as the request
  */
  handle_response(content: string, id: number) {
  }
}

