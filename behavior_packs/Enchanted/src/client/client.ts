import { system, } from "@minecraft/server";
import { compress, decompress } from "lz-string";
import { ClientPacketMessage, ClientInitializationMessage, ClientFinalizationMessage } from "./message.ts";
import { ServerPacketMessage, ServerFinalizeMessage } from "../server/message.ts";
import { RequestType, ResponseType } from "../../../Enchanted/src/common/types.ts";

export interface RequestConfig {
  piece_len: number;
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

  private request_idx = 0;
  //Awaiting promises. In case the responses
  private responses: Map<number, ResponseData> = new Map;

  constructor(protected readonly config: RequestConfig) {
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
      }
    });
  }


  protected receive_packet(message: ServerPacketMessage): boolean {
    if (message.target != this.config.uuid) return false;
    this.responses.get(message.id)!.body += message.content;
    return true;
  }

  protected receive_finalization(message: ServerFinalizeMessage) {
    if (message.target != this.config.uuid) return false;
    const res = this.responses.get(message.id)!;
    const decompressed = decompress(res.body);
    res.ok(decompressed);
    this.responses.delete(message.id);
    this.handle_response(decompressed, message.id);
    return true;
  }

  private initialize_request() {
    const message = new ClientInitializationMessage(this.config.uuid, this.config.target!, this.request_idx);
    system.sendScriptEvent(RequestType.Initialization, message.encode());
  }
  /**
  * Sends the given content to Enchanted Server splitting its contents. Its a generator due to runJob
  * Spltilen must be <=2048, or else it will be truncated. The limit of system scriptEventReceive message is 2048
  */
  private *make_request(content: string) {

    const splitlen = Math.min(this.config.piece_len, 2048);
    const compressed = compress(content);
    this.initialize_request();
    const message = new ClientPacketMessage(this.config.target!, this.config.uuid, '', this.request_idx);
    for (let i = 0, j = compressed.length; i < j;) {
      message.content = compressed.substring(i, i += splitlen);
      yield system.sendScriptEvent(RequestType.PacketData, message.encode());
    }
    this.finalize_request();
    this.request_idx = (this.request_idx + 1) % 1024;

  }

  private finalize_request() {
    const message = new ClientFinalizationMessage(this.config.uuid, this.config.target!, this.request_idx).encode();
    system.sendScriptEvent(RequestType.Finalization, message);
  }

  /**
  * Compress the given data and requests it to Enchanted Server target.  Parts len is the length of each piece of data. 2048 is the max
  */
  send_raw(data: string): Promise<string> {
    if (this.config.target) return new Promise((ok, err) => {
      this.responses.set(this.request_idx, { ok, body: '' });
      system.runJob(this.make_request(data));
    });
    return new Promise((_, err) => err(new Error("Client does not have a target")));
  }

  /**
   * Converts the given object and sends it to the server. The server must implement that object request type
   */
  async send_object(obj: object) {
    return JSON.parse(await this.send_raw(JSON.stringify(obj)));
  }

  handle_response(content: string, id: number) {
  }
}

