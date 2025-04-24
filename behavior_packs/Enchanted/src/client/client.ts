import { system, world } from "@minecraft/server";
import { compress, decompress } from "lz-string";

export interface RequestConfig {
  piece_len: number;

}


/**
 * Creates a new EnchantedClient. The uuid is an uuid that is static and not expected to be changed. Preferly it's better to use the uuid of the behavior pack itself
 */
export class EnchantedClient {

  configs: RequestConfig = {
    piece_len: 1024
  };
  private request_idx = 0;
  private responses: string[] = [];

  constructor(public readonly uuid: string) {
    system.afterEvents.scriptEventReceive.subscribe(e => {
      if (e.id == "enchanted:response") {
        if (e.message == this.uuid) this.responses.push("");
      } else if (e.id == "enchanted:response_data") {
        const splitted = e.message.split('\x01');
        if (splitted[0] == this.uuid) this.responses[splitted[1]] += splitted[2];
      } else if (e.id == "enchanted:response_end") {
        const splitted = e.message.split('\x01');
        if (splitted[0] == this.uuid) {
          const decompressed = decompress(this.responses[splitted[1]]);
          this.handle_request(decompressed);
        }

      } else if (e.id == "enchanted:request_reset" && this.uuid == e.message) {
        this.request_idx = 0;
      }
    })
  }

  configure_request(configs: RequestConfig) {
    this.configs = configs;
    return this;
  }
  private initialize_request() {
    this.request_idx++;
    system.sendScriptEvent("enchanted:request", this.uuid);
  }
  /**
  * Sends the given content to Enchanted Server splitting its contents. Its a generator due to runJob
  * Spltilen must be <=2048, or else it will be truncated. The limit of system scriptEventReceive message is 2048
  */
  private * make_request(content: string) {
    const splitlen = Math.min(this.configs.piece_len, 2048);
    const header = `${this.uuid}\x01${this.request_idx}\x01`;
    const compressed = compress(content);
    this.initialize_request();
    world.sendMessage("Content is: " + header + compressed.substring(0, Math.min(splitlen, compressed.length - 0)));
    for (let i = 0, j = compressed.length; i < j; i += splitlen) yield system.sendScriptEvent("enchanted:request_data", header + compressed.substring(i, i + Math.min(splitlen, j - i)));
    this.finalize_request();
  }

  private finalize_request() {
    system.sendScriptEvent("enchanted:request_end", this.uuid);
  }

  /**
  * Compress the given data and requests it to Enchanted Server.  Parts len is the length of each piece of data. 2048 is the max
  */
  send_raw(data: string) {
    world.sendMessage("Client sending: " + data);
    system.runJob(this.make_request(data));
  }

  /**
   * Converts the given object and sends it to the server. The server must implement that object request type
   */
  send_object(obj: object) {
    const data = JSON.stringify(obj);
    return this.send_raw(data);
  }

  handle_request(content: string) {
    world.sendMessage("Client received: " + content);
  }
}

