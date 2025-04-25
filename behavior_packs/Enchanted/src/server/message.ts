import { SystemMessage } from "./message";

/**
 * A server message to the client telling it to finalize a request and handle it
 */
export class ServerFinalizeMessage implements SystemMessage {

  constructor(public target: string, public id: number) { }

  encode(): string {
    return `${this.target}\x01${this.id}`;
  }
  decode(content: string): void {
    const splitted = content.split("\x01", 2);
    this.target = splitted[0];
    this.id = parseInt(splitted[1]);
  }
}

/**
 * A server message to the client of a streammed part of the response
 */
export class ServerPacketMessage implements SystemMessage {
  private header: string;
  constructor(public target: string, public id: number, public content: string) {
    this.header = this.target + "\x01" + this.id + "\x01";
  }

  encode(): string {
    return `${this.header}${this.content}`;
  }
  decode(content: string): void {
    const splitted = content.split("\x01", 3);
    this.target = splitted[0];
    this.id = parseInt(splitted[1]);
    this.content = splitted[2];
  }
}
