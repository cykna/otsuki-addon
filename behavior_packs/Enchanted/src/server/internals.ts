import { system } from "@minecraft/server";
import { ResponseType } from "../common/types";
import { ServerBatchedMessage, ServerFinalizeMessage, ServerPacketMessage, ServerSingleResponseMessage } from "../common/messages/server.ts";
import lz from "lz-string";
import { SIZE_LIMIT, REQUEST_AMOUNT_LIMIT, APPROXIMATED_UNCOMPRESSED_LIMIT } from "@zetha/constants";
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
 * Gets the request sent by a client, handles it and sends it's response back
 */
export function* send_response(response: string, target: string, id: number) {

  yield* send_packet(response, target, id);

  system.sendScriptEvent(ResponseType.Finalization, new ServerFinalizeMessage(target, id).encode());

}

/**
 * Blocks the thread until the given is sent to the target. Streams if contents are larger than 2Kb
 * This function is literally the same as send_packet but without being a generator
 */
export function send_packet_blocking(buffer: string, target: string, id: number) {
  const message = new ServerPacketMessage(target, id, '');

  for (let i = 0, j = buffer.length; i < j; i += SIZE_LIMIT) {
    message.content = buffer.substring(i, i + SIZE_LIMIT);
    system.sendScriptEvent(ResponseType.PacketData, message.encode());
  }
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
  const content = lz.compress(message.encode());
  system.sendScriptEvent(ResponseType.BatchResponse, content);
}

/**
 * Sends a single response back to the client
 */
export function send_single(message: ServerSingleResponseMessage) {
  system.sendScriptEvent(ResponseType.SingleResponse, message.encode());
}
