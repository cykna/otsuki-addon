import { SystemMessage } from "./message";

/**
 * A server message to the client telling it to finalize a request and handle it
 */
export class ServerFinalizeMessage implements SystemMessage {

  constructor(public target: string, public response_index: number) { }

  encode(): string {
    return `${this.target}${String.fromCharCode(this.response_index)}`;
  }
  decode(content: string): void {
    this.target = content.slice(0, 2);
    this.response_index = content.charCodeAt(2);
  }
}

/**
 * A server message to the client of a streammed part of the response
 */
export class ServerPacketMessage implements SystemMessage {
  constructor(public target: string, public response_index: number, public content: string) { }
  //[client][req_id][content]
  encode(): string {
    return `${this.target}${String.fromCharCode(this.response_index)}${this.content}`;
  }
  decode(content: string): void {
    this.target = content.slice(0, 2);
    this.response_index = content.charCodeAt(2);
    this.content = content.slice(3);
  }
}

export interface BatchedResponseData {
  body: string,
  id: number
}

export class ServerBatchedMessage implements SystemMessage {
  private response_buffer: string[] = [];
  private responses: BatchedResponseData[] = [];
  constructor(public client_id: string) { }

  len() {
    return this.response_buffer.length;
  }
  add_response(res: string, id: number) {
    this.response_buffer.push(String.fromCharCode(id) + String.fromCharCode(res.length) + res);
  }
  //[client_id][...(id|size|req<i++>)]
  encode(): string {

    return `${this.client_id}${this.response_buffer.join("")}`;
  }
  decode(content: string): void {
    const len = content.length - 2;
    this.client_id = content.slice(0, 2);
    let i = 2;
    for (; i < len;) {
      const req_id = content.charCodeAt(i);
      const req_size = content.charCodeAt(i + 1);
      i += 2;
      this.response_buffer.push(String.fromCharCode(req_id) + String.fromCharCode(req_size) + content.slice(i, i + req_size + 1));
      this.responses.push({
        body: content.slice(i, i + req_size + 1),
        id: req_id
      })
      i += req_size + 1;
    }
  }
  /**
  * Clears the data and the responses array, not data from the message itself
  */
  reset() {
    this.response_buffer.length = 0;
    this.responses.length = 0;
  }
}

export class ServerSingleResponseMessage implements SystemMessage {
  constructor(public client_id: string, public request_index: number, public content: string) {
  }
  //[client_id][id][data]
  encode(): string {
    return `${this.client_id}${String.fromCharCode(this.request_index)}${this.content}`;
  }
  decode(content: string): void {
    this.client_id = content.slice(0, 2);
    this.request_index = content.charCodeAt(2);
    this.content = content.slice(3);
  }
}
