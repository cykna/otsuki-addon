import { system } from "@minecraft/server";
import { EnchantedServer } from "./server";
import { ResponseType } from "../common/types";
import { ServerFinalizeMessage, ServerPacketMessage } from "./message.ts";

/**
 * Sends the given buffer to the target by streamming if compressed contents are larger than 2Kb
 */
export function* send_packet(buffer: string, target: string, id: number) {

  const message = new ServerPacketMessage(target, id, '');

  for (let i = 0, j = buffer.length; i < j; i += 2048) {
    message.content = buffer.substring(i, i + 2048);
    yield system.sendScriptEvent(ResponseType.PacketData, message.encode());
  }
}

/**
 * Gets the request sent by a client, handles it and sends it's response back
 */
export function* send_response(response: string, target: string, id: number) {
  if (EnchantedServer.running_server == null) throw new Error("No Server is running to send a response. Error on server implementation");

  yield* send_packet(response, target, id);

  yield system.sendScriptEvent(ResponseType.Finalization, new ServerFinalizeMessage(target, id).encode());

}
