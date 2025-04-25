export enum ResponseType {
  PacketData = "enchanted:response_data",
  Finalization = "enchanted:response_end"
}

export enum RequestType {
  Initialization = "enchanted:request",
  PacketData = "enchanted:request_data",
  Finalization = "enchanted:finalize_request"
}
