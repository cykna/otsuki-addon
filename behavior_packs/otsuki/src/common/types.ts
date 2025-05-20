import { ResponseJson } from "./Response";

export enum ResponseType {
  PacketData = "enchanted:response_data",
  BatchResponse = "enchantend:batch_response",
  SingleResponse = "enchanted:single_response",
  Finalization = "enchanted:response_end"
}

export enum RequestType {
  Initialization = "enchanted:request",
  PacketData = "enchanted:request_data",
  BatchRequest = "enchanted:batch_request",
  SingleRequest = "enchanted:single_request",
  Finalization = "enchanted:finalize_request"
}

export type Throwable<T> = T;
export type RoutingFunc = (reqbody: any, params: Record<string, string>, client_id: string, req_id: number) => Promise<Throwable<ResponseJson>>;
