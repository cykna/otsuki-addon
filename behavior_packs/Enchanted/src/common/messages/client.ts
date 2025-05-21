import { SystemMessage } from "./message";

function header(client: string, server: string, req: number) {
  return client + server + String.fromCharCode(req);
}

/**
 * A client message to the server of requesting initialization
 */
export class ClientInitializationMessage implements SystemMessage {

  static from(content: string) {
    return new ClientFinalizationMessage(content.slice(0, 2), content.slice(2, 4), content.charCodeAt(4));
  }

  constructor(public client_id: string, public server_id: string, public request_index: number) { }

  /**
   * Encodes this Message into a single message. It's defined as
   * [2c:CLIENT_ID][2c:SERVER_ID][1c:REQUEST_INDEX].
   * Obs: Nc = N chars.
   */
  encode(): string {
    return this.client_id + this.server_id + String.fromCharCode(this.request_index);
  }
}
/**
 * A client message to the server of a streammed part of the packet.
 */
export class ClientPacketMessage implements SystemMessage {

  static from(content: string) {
    return new ClientPacketMessage(content.slice(0, 2), content.slice(2, 4), content.slice(5), content.charCodeAt(4));
  }

  constructor(public client_id: string, public server_id: string, public content: string, public request_index: number) {
  }

  /**
   * Encodes this Message into a single message. It's defined as
   * [2c:CLIENT_ID][2c:SERVER_ID][1c:REQUEST_INDEX][Nc:PACKET].
   * Obs: Nc = N chars.
   */
  encode(): string {
    return `${header(this.client_id, this.server_id, this.request_index)}${this.content}`;
  }
}

/**
 * A client message to the server saying the request finalized
 */
export class ClientFinalizationMessage implements SystemMessage {

  static from(content: string) {
    return new ClientFinalizationMessage(content.slice(0, 2), content.slice(2, 4), content.charCodeAt(4));
  }

  constructor(public client_id: string, public server_id: string, public request_index: number) {
  }

  encode(): string {
    return this.client_id + this.server_id + String.fromCharCode(this.request_index);
  }
}

export interface RequestData {
  body: string;
  id: number;
}

export class ClientBatchMessage implements SystemMessage {

  static from(content: string) {
    const out = new ClientBatchMessage(content.slice(0, 2), content.slice(2, 4));
    const len = content.length;
    for (let i = 4; i < len;) {
      const req_size = content.charCodeAt(i);
      const req_id = content.charCodeAt(i + 1);
      out.requests.push({ body: content.slice(i + 2, i + 2 + req_size), id: req_id });
      i += req_size;
    }
    return out;
  }

  private request_buffer: string[] = [];
  public requests: RequestData[] = [];
  constructor(public client_id: string, public server_id: string) {

  }

  /**
   * The length of requests stored in the internal buffer. Does not represent the actual requests that can be read, but in fact, the stored ones to be sent.
   */
  len() {
    return this.request_buffer.length;
  }

  add_request(req: string, id: number) {
    this.request_buffer.push(String.fromCharCode(req.length) + String.fromCharCode(id) + req);
  }

  encode() {
    return `${this.client_id}${this.server_id}${this.request_buffer}`;
  }
  /**
  * Clears the internal buffer and the requests array. Not data from the message itself
  */
  clear() {
    this.request_buffer = [];
    this.requests.length = 0;
  }
}

export class ClientSingleResquestMessage implements SystemMessage {

  static from(content: string) {
    const out = new ClientSingleResquestMessage(content.slice(0, 2), content.slice(2, 4), content.charCodeAt(4));
    out.content = content.slice(5);
    return out;
  }

  public content = "";
  constructor(public client_id: string, public server_id: string, public request_index: number) { }

  encode(): string {
    return header(this.client_id, this.server_id, this.request_index) + this.content;
  }
}
