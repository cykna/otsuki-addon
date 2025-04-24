import { system, world } from "@minecraft/server";
import { compress, decompress } from "lz-string";

export interface RequestConfig {
  piece_len: number;
  target?: string;
  uuid: string;
}

/**
 * Creates a new EnchantedClient. The uuid is an uuid that is static and not expected to be changed. Preferly it's better to use the uuid of the behavior pack itself
 */
export class EnchantedClient {

  private request_idx = 0;
  private responses: string[] = [];
  private ok_promises: ((value: any) => any)[] = [];

  constructor(private config: RequestConfig) {
    system.afterEvents.scriptEventReceive.subscribe(e => {
      if (e.id == "enchanted:response") {
        if (e.message == this.config.uuid) this.responses.push("");
      } else if (e.id == "enchanted:response_data") {
        const splitted = e.message.split('\x01');
        if (splitted[0] == this.config.uuid) this.responses[splitted[1]] += splitted[2];
      } else if (e.id == "enchanted:response_end") {
        const splitted = e.message.split('\x01');
        if (splitted[0] == this.config.uuid) {
          const decompressed = decompress(this.responses[splitted[1]]);
          this.ok_promises[splitted[1]](decompressed);
          this.handle_response(decompressed, parseInt(splitted[1]));
        }
      } else if (e.id == "enchanted:request_reset" && this.config.uuid == e.message) {
        this.request_idx = 0;
      }
    });
  }

  private initialize_request() {
    this.request_idx++;
    system.sendScriptEvent("enchanted:request", this.config.uuid + "\x01" + this.config.target!);
  }
  /**
  * Sends the given content to Enchanted Server splitting its contents. Its a generator due to runJob
  * Spltilen must be <=2048, or else it will be truncated. The limit of system scriptEventReceive message is 2048
  */
  private * make_request(content: string) {
    const splitlen = Math.min(this.config.piece_len, 2048);
    const header = `${this.config.uuid}\x01${this.config.target}\x01${this.request_idx}\x01`;
    const id = this.request_idx;
    const compressed = compress(content);
    this.initialize_request();
    for (let i = 0, j = compressed.length; i < j; i += splitlen) yield system.sendScriptEvent("enchanted:request_data", header + compressed.substring(i, i + Math.min(splitlen, j - i)));
    this.finalize_request(id);
  }

  private finalize_request(id: number) {
    system.sendScriptEvent("enchanted:finalize_request", `${this.config.uuid}\x01${this.config.target}\x01${id}`);
    this.request_idx--;
  }

  /**
  * Compress the given data and requests it to Enchanted Server target.  Parts len is the length of each piece of data. 2048 is the max
  */
  send_raw(data: string): Promise<string> {
    if (this.config.target) return new Promise((ok, err) => {
      this.ok_promises[this.request_idx] = ok;
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
    world.sendMessage("Received: " + content + " from id: " + id);
  }
}

