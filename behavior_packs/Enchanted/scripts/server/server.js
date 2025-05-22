import { system } from "@minecraft/server";
import { ClientFinalizationMessage } from "../common/messages/client.js";
import { ClientInitializationMessage } from "../common/messages/client.js";
import { ClientPacketMessage } from "../common/messages/client.js";
import { ClientSingleResquestMessage } from "../common/messages/client.js";
import { RequestType } from "../common/types.js";
import { send_batch } from "./internals.js";
import { send_response } from "./internals.js";
import { send_response_blocking } from "./internals.js";
import { send_single } from "./internals.js";
import { decompress } from "../common/compression/index.js";
import { compress } from "../common/compression/index.js";
import { ClientBatchMessage } from "../common/messages/client.js";
import { ServerBatchedMessage } from "../common/messages/server.js";
import { ServerSingleResponseMessage } from "../common/messages/server.js";
import { EnchantedClient } from "../client/client.js";
system.afterEvents.scriptEventReceive.subscribe((e)=>{
    if (!EnchantedServer.running_server) return;
    switch(e.id){
        case RequestType.Initialization:
            {
                const message = ClientInitializationMessage.from(e.message);
                EnchantedServer.running_server.receive_initialization(message);
                break;
            }
        case RequestType.PacketData:
            {
                const message = ClientPacketMessage.from(e.message);
                EnchantedServer.running_server.receive_client_packet(message);
                break;
            }
        case RequestType.Finalization:
            {
                const message = ClientFinalizationMessage.from(e.message);
                EnchantedServer.running_server.receive_client_finalization(message);
                break;
            }
        case RequestType.BatchRequest:
            {
                const decompressed_message = decompress(e.message);
                const message = ClientBatchMessage.from(decompressed_message);
                EnchantedServer.running_server.receive_client_batch(message);
                break;
            }
        case RequestType.SingleRequest:
            {
                const message = ClientSingleResquestMessage.from(e.message);
                EnchantedServer.running_server.receive_client_single(message);
            }
    }
});
//a server can be a client as well
export class EnchantedServer extends EnchantedClient {
    static{
        this.running_server = null;
    }
    static{
        this.requests = new Map;
    }
    constructor(config){
        super(config);
        EnchantedServer.running_server ??= this;
    }
    receive_client_single(message) {
        if (message.server_id != this.config.uuid) return false;
        const decompressed = decompress(message.content);
        this.handle_request(decompressed, message.client_id, message.request_index).then((res)=>{
            const response = compress(res);
            if (response.length > 2048) send_response(response, message.client_id, message.request_index);
            else {
                const server_message = new ServerSingleResponseMessage(message.client_id, message.request_index, response);
                send_single(server_message);
            }
        });
        return true;
    }
    /**
   * Server handler wen asked to prepare a request. If the target id doesn't match with this server id, nothing happens.
   * @param message The message with client and request information
   */ receive_initialization(message) {
        if (this.config.uuid != message.server_id) return false;
        const request = EnchantedServer.requests.get(message.client_id);
        if (request) request.set(message.request_index, {
            content: []
        });
        else EnchantedServer.requests.set(message.client_id, new Map([
            [
                message.request_index,
                {
                    content: []
                }
            ]
        ]));
        return true;
    }
    /**
   * A server handler for when receiving a packet request. (maybe)Is not the total request body, but instead, a streammed part of it.
   * @param message The client message with the informations about the packet
   * @obs The content of the message is compressed
   */ receive_client_packet(message) {
        if (message.server_id != this.config.uuid) return false;
        const request = EnchantedServer.requests.get(message.client_id);
        if (!request) throw new Error(`Not recognized client: ${message.client_id}`);
        request.get(message.request_index).content.push(message.content);
        return true;
    }
    /**
   * A server handler for when receiving a batch request. If this is received, it handles all the requests and sends back to the client immediatly.
   * Diferent of normal requests, this is expected to have a lot of requests in once, so no needs for telling when initialize or finish.
   */ receive_client_batch(message) {
        if (message.server_id != this.config.uuid) return false;
        const server_message = new ServerBatchedMessage(message.client_id);
        if (this.config.block_request) this.handle_batch_blocking(message, server_message);
        else system.runJob(this.handle_batch_nonblocking(message, server_message));
        return true;
    }
    /**
  * Batches an specific amount of request. It handles all of them and keeps adding on the server_message param, when it's needed to be sent, its sent.
  * As this functino does not block, it sends a batch per tick. If there are 4 batches required, is 4 ticks needed, but remember, if these responses are not big, then 1 tick can mean >100 requests.
  */ *handle_batch_nonblocking(message, server_message) {
        for (const request of message.requests)yield void this.handle_request(request.body, message.client_id, request.id).then((response)=>{
            if (response.length + server_message.len() > 2662.4) {
                send_batch(server_message);
                server_message.reset();
            }
            server_message.add_response(response, request.id);
        });
    }
    /**
  * Batches an specific amount of request. It handles all of them and keeps adding on the server_message param, when it's needed to be sent, its sent.
  * As this function does block, it can send >1 response to the client on the same tick.
  */ handle_batch_blocking(message, server_message) {
        for (const request of message.requests)this.handle_request(request.body, message.client_id, request.id).then((response)=>{
            if (response.length + server_message.len() > 2662.4) {
                send_batch(server_message);
                server_message.reset();
            }
            server_message.add_response(response, request.id);
        });
    }
    /**
   * A server handler for when an usual request is finalized and the server is asked to give it a response.
   * @param message The message sent by the client with information about the request.
   */ receive_client_finalization(message) {
        if (this.config.uuid != message.server_id) return false;
        const request = EnchantedServer.requests.get(message.client_id);
        if (!request) throw new Error(`Not recognized client: ${message.client_id}`);
        const content = decompress(request.get(message.request_index).content.join(''));
        this.handle_request(content, message.client_id, message.request_index).then((response)=>{
            if (this.config.block_request) send_response(compress(response), message.client_id, message.request_index);
            else send_response_blocking(compress(response), message.client_id, message.request_index);
            request.delete(message.request_index);
        });
        return true;
    }
    async handle_request(req, client, req_id) {
        const data = this.handle(JSON.parse(req), client, req_id);
        return JSON.stringify(data);
    }
    async handle(obj, client, req_id) {
        return "Todo! Enchanted Server default handle function is meant to be overwritten";
    }
}
