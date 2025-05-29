import { system } from "@minecraft/server";

import { ServerBatchedMessage, ServerFinalizeMessage, ServerPacketMessage, ServerSingleResponseMessage } from "../../common/messages/server.ts";
import { SIZE_LIMIT, REQUEST_AMOUNT_LIMIT, APPROXIMATED_UNCOMPRESSED_LIMIT } from "@zetha/constants";
import { compress } from "../../common/compression/index.ts";
/**
 * Sends the given buffer to the target by streamming if compressed contents are larger than 2Kb
 */
export function* send_packet(buffer: string, target: string, id: number) {
  const message = new ServerPacketMessage(target, id, '');

  for (let i = 0, j = buffer.length; i < j; i += SIZE_LIMIT) {
    message.content = buffer.substring(i, i + SIZE_LIMIT);
    yield system.sendScriptEvent(ResponseType.PacketData, message.encode());
  }
}

/**
 * Blocks the thread until the given is sent to the target. Streams if contents are larger than 2Kb
 * This function is literally the same as send_packet but without using system.runJob to send the data.
 */
export function send_packet_blocking(buffer: string, target: string, id: number) {
  const message = new ServerPacketMessage(target, id, '');

  for (let i = 0, j = buffer.length; i < j; i += SIZE_LIMIT) {
    message.content = buffer.substring(i, i + SIZE_LIMIT);
    system.sendScriptEvent(ResponseType.PacketData, message.encode());
  }
}

/**
 * Sends the given response to the given target. The target will receive the given data but will try to understand it as a Streammed response.
 */
export function send_response(response: string, target: string, id: number) {
  system.runJob(send_packet(response, target, id));
  system.sendScriptEvent(ResponseType.Finalization, new ServerFinalizeMessage(target, id).encode());

}


/**
 * Gets the request sent by a client, handles it and sends it's response back.
 * Blocks the server thread. This function is literally the same as send_response but without being a generator
 */
export function send_response_blocking(response: string, target: string, id: number) {
  send_packet_blocking(response, target, id);
  system.sendScriptEvent(ResponseType.Finalization, new ServerFinalizeMessage(target, id).encode());

}

//Internal, should not be used
export function send_batch(message: ServerBatchedMessage) {
  const content = compress(message.encode());
  system.sendScriptEvent(ResponseType.BatchResponse, content);
}

/**
 * Sends a single response back to the client. Single responses are such as normal responses(streammed), but it not requires telling the client it's going to send data, stream the data(if needed) and tell the client it ended.
 * It simply sends data without checking if the size is inside the bounds. This function gives the responsability of data < 2kb to the callee 
 */
export function send_single(message: ServerSingleResponseMessage) {
  system.sendScriptEvent(ResponseType.SingleResponse, message.encode());
}
