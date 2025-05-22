export var ResponseType = /*#__PURE__*/ function(ResponseType) {
    ResponseType["PacketData"] = "enchanted:response_data";
    ResponseType["BatchResponse"] = "enchantend:batch_response";
    ResponseType["SingleResponse"] = "enchanted:single_response";
    ResponseType["Finalization"] = "enchanted:response_end";
    return ResponseType;
}({});
export var RequestType = /*#__PURE__*/ function(RequestType) {
    RequestType["Initialization"] = "enchanted:request";
    RequestType["PacketData"] = "enchanted:request_data";
    RequestType["BatchRequest"] = "enchanted:batch_request";
    RequestType["SingleRequest"] = "enchanted:single_request";
    RequestType["Finalization"] = "enchanted:finalize_request";
    return RequestType;
}({});
