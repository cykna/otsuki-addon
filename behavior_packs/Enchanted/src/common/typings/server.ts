import { RequestType } from "../protocol.ts";
import { ClientConfig } from "./client";

export interface ZethaRequest {
  content: string[];
};

/**
 * The body of the some request received from a client.
 */
export interface ReceivedRequest {
  server_id: string;
  client_id: string;
  body: string;
  type: RequestType;
  request_index: number;
}

;
export interface ServerConfig extends ClientConfig {
  block_request: boolean;
}
