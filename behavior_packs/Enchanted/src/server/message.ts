import { SystemMessage } from "../common/message";

/**
 * A server message to the client telling it to finalize a request and handle it
 */
export class ServerFinalizeMessage implements SystemMessage {

  constructor(public target: string, public response_index: number) { }

  encode(): string {
    return `${this.target}\x01${this.response_index}`;
  }
  decode(content: string): void {
    const splitted = content.split("\x01", 2);
    this.target = splitted[0];
    this.response_index = parseInt(splitted[1]);
  }
}

/**
 * A server message to the client of a streammed part of the response
 */
export class ServerPacketMessage implements SystemMessage {
  private header: string;
  constructor(public target: string, public response_index: number, public content: string) {
    this.header = this.target + "\x01" + this.response_index + "\x01";
  }

  encode(): string {
    return `${this.header}${this.content}`;
  }
  decode(content: string): void {
    const splitted = content.split("\x01", 3);
    this.target = splitted[0];
    this.response_index = parseInt(splitted[1]);
    this.content = splitted[2];
  }
}

export interface BatchedResponseData {
  body: string,
  id: number
}

export class ServerBatchedMessage implements SystemMessage {
  private response_buffer = "";
  public responses: BatchedResponseData[] = [];
  constructor(public client_id: string) { }

  len() {
    return this.response_buffer.length;
  }

  add_response(res: string, id: number) {
    if (this.response_buffer == "") this.response_buffer = res + "\x03" + id;
    else this.response_buffer += "\x02" + res + "\x03" + id;
  }

  encode(): string {
    return `${this.client_id}\x01${this.response_buffer}`;
  }
  decode(content: string): void {
    const [client_id, batch_content] = content.split("\x01", 2);
    this.client_id = client_id;
    this.responses = batch_content.split("\x02").map(res => {
      const [body, id] = res.split("\x03", 2);
      return {
        body, id: parseInt(id)
      }
    })
  }
  /**
  * Clears the data and the responses array, not data from the message itself
  */
  reset() {
    this.responses.length = 0;
    this.response_buffer = "";
  }
}
