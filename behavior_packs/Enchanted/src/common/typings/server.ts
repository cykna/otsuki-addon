import { RequestType } from "../types";

export interface EnchantedRequest {
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
};
