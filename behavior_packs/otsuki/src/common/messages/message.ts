export interface SystemMessage {
  encode(): string;
  decode(content: string): void;
}
