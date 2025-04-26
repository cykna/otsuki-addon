export enum ResponseType {
  PacketData = "enchanted:response_data",
  BatchResponse = "enchantend:batch_response",
  Finalization = "enchanted:response_end"
}

export enum RequestType {
  Initialization = "enchanted:request",
  PacketData = "enchanted:request_data",
  BatchRequest = "enchanted:batch_request",
  Finalization = "enchanted:finalize_request"
}
