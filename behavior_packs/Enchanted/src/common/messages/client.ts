import { SystemMessage } from "./message";

/**
 * A client message to the server of requesting initialization
 */
export class ClientInitializationMessage implements SystemMessage {
  constructor(public client_id: string, public server_id: string, public request_index: number) { }

  encode(): string {
    return `${this.client_id}\x01${this.server_id}\x01${this.request_index}`;
  }

  decode(content: string): void {
    const splitted = content.split('\x01', 3);
    this.client_id = splitted[0];
    this.server_id = splitted[1];
    this.request_index = parseInt(splitted[2]);
  }
}
/**
 * A client message to the server of a streammed part of the packet.
 */
export class ClientPacketMessage implements SystemMessage {
  private header: string;
  constructor(public server_id: string, public client_id: string, public content: string, public request_index: number) {
    this.header = `${this.client_id}\x01${this.server_id}\x01${this.request_index}\x01`;
  }

  encode(): string {
    return `${this.header}${this.content}`;
  }

  decode(content: string): void {
    const splitted = content.split("\x01", 4);
    this.client_id = splitted[0];
    this.server_id = splitted[1];
    this.request_index = parseInt(splitted[2]);
    this.content = splitted[3];
  }
}

/**
 * A client message to the server saying the request finalized
 */
export class ClientFinalizationMessage implements SystemMessage {

  constructor(public client_id: string, public server_id: string, public request_index: number) {
  }
  encode(): string {
    return `${this.client_id}\x01${this.server_id}\x01${this.request_index}`
  }
  decode(content: string) {
    const splitted = content.split("\x01", 3);
    this.client_id = splitted[0];
    this.server_id = splitted[1];
    this.request_index = parseInt(splitted[2]);
  }
}

export interface RequestData {
  body: string;
  id: number;
}

export class ClientBatchMessage implements SystemMessage {
  private request_buffer = "";
  public requests: RequestData[] = [];
  constructor(public client_id: string, public server_id: string) {

  }
  len() {
    return this.request_buffer.length;
  }
  add_request(req: string, id: number) {
    if (this.request_buffer == "") this.request_buffer = req + "\x03" + id;
    else this.request_buffer += "\x02" + req + "\x03" + id;
  }
  encode() {
    return `${this.request_buffer}\x01${this.client_id}\x01${this.server_id}`
  }
  decode(content: string): void {
    const [requests, client, server] = content.split("\x01", 3);
    this.client_id = client;
    this.server_id = server;
    this.requests = requests.split("\x02").map(req => {
      const [body, id] = req.split("\x03");
      return {
        body,
        id: parseInt(id)
      }
    })
  }
  /**
  * Clears the internal buffer and the requests array. Not data from the message itself
  */
  clear() {
    this.request_buffer = "";
    this.requests.length = 0;
  }
}
