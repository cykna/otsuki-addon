import { system } from "@minecraft/server";
import { RequestType } from "../common/types.js";
import { send_batch } from "../helpers/server/internals.js";
import { send_response } from "../helpers/server/internals.js";
import { send_response_blocking } from "../helpers/server/internals.js";
import { send_single } from "../helpers/server/internals.js";
import { decompress } from "../common/compression/index.js";
import { compress } from "../common/compression/index.js";
import { ClientBatchMessage } from "../common/messages/client.js";
import { ClientFinalizationMessage } from "../common/messages/client.js";
import { ClientInitializationMessage } from "../common/messages/client.js";
import { ClientPacketMessage } from "../common/messages/client.js";
import { ClientSingleResquestMessage } from "../common/messages/client.js";
import { ServerBatchedMessage } from "../common/messages/server.js";
import { ServerSingleResponseMessage } from "../common/messages/server.js";
import { EnchantedClient } from "../client/client.js";
import { channel } from "../helpers/mpsc/channel.js";
system.afterEvents.scriptEventReceive.subscribe((e)=>{
    if (!EnchantedClient.running_client || !(EnchantedClient.running_client instanceof QueuedZethaServer)) return;
    const client = EnchantedClient.running_client;
    let message;
    switch(e.id){
        case RequestType.Initialization:
            message = ClientInitializationMessage.from(e.message);
            break;
        case RequestType.PacketData:
            message = ClientPacketMessage.from(e.message);
            break;
        case RequestType.Finalization:
            message = ClientFinalizationMessage.from(e.message);
            break;
        case RequestType.BatchRequest:
            {
                const decompressed_message = decompress(e.message);
                const message = ClientBatchMessage.from(decompressed_message);
                if (message.client_id != client.config.uuid) return;
                client.receive_client_batch(message);
                return;
            }
        case RequestType.SingleRequest:
            message = ClientSingleResquestMessage.from(e.message);
            break;
        default:
            return;
    }
    if (message.server_id != client.config.uuid) return;
    client.send_request({
        body: message?.content ?? '',
        client_id: message.client_id,
        server_id: message.server_id,
        request_index: message.request_index,
        type: e.id
    });
});
//a server can be a client as well
export class QueuedZethaServer extends EnchantedClient {
    static{
        this.requests = new Map;
    }
    constructor(config){
        super(config);
        const [tx, rx] = channel();
        this.tx = tx;
        this.rx = rx;
    }
    async *[Symbol.asyncIterator]() {
        yield* this.rx;
    }
    /**
   * Queues the given request on this server. Awaits for all the others before the given to be resolved, then, it starts to run. If you want something where the order does not matter,
   * and without the need to await, use ZethaServer instead.
   */ send_request(req) {
        this.tx.send(req);
    }
    /**
   * A server handler for when receiving a batch request. If this is received, it handles all the requests and sends back to the client immediatly.
   * Diferent of normal requests, this is expected to have a lot of requests in once, so no needs for telling when initialize or finish.
   */ receive_client_batch(message) {
        const server_message = new ServerBatchedMessage(message.client_id);
        if (this.config.block_request) this.handle_batch_blocking(message, server_message);
        else system.runJob(this.handle_batch_nonblocking(message, server_message));
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
    async handle_request(req, client, req_id) {
        const data = this.handle(JSON.parse(req), client, req_id);
        return data.then(JSON.stringify);
    }
    async handle(obj, client, req_id) {
        return "Todo! Enchanted Server default handle function is meant to be overwritten";
    }
    handle_initialization(req) {
        const request = QueuedZethaServer.requests.get(req.client_id);
        if (request) request.set(req.request_index, {
            content: []
        });
        else QueuedZethaServer.requests.set(req.client_id, new Map([
            [
                req.request_index,
                {
                    content: []
                }
            ]
        ]));
    }
    async handle_finalization(req) {
        const request = QueuedZethaServer.requests.get(req.client_id);
        if (!request) throw new Error(`Not recognized client: ${req.client_id}`);
        const data = compress(await this.handle_request(decompress(request.get(req.request_index).content.join('')), req.client_id, req.request_index));
        if (this.config.block_request) send_response_blocking(data, req.client_id, req.request_index);
        else send_response(data, req.client_id, req.request_index);
        request.delete(req.request_index);
    }
    async handle_single_req(req) {
        const response = compress(await this.handle_request(req.body, req.client_id, req.request_index));
        if (response.length > 2048) send_response(response, req.client_id, req.request_index);
        else send_single(new ServerSingleResponseMessage(req.client_id, req.request_index, response));
    }
    handle_packet(req) {
        const request = QueuedZethaServer.requests.get(req.client_id)?.get(req.request_index);
        if (!request) throw new Error(`Not recognized client with id: ${req.client_id} with id ${req.request_index}`);
        request.content.push(req.body);
    }
    /**
  * Initializes the server and starts receiving requests. If some request is given before this, the data is simply lost.
  */ async listen() {
        console.log("imma try to listen");
        for await (const req of this.rx){
            console.log(req.type);
            switch(req.type){
                case RequestType.SingleRequest:
                    await this.handle_single_req(req);
                    break;
                case RequestType.Initialization:
                    this.handle_initialization(req);
                    break;
                case RequestType.Finalization:
                    await this.handle_finalization(req);
                    break;
                case RequestType.PacketData:
                    this.handle_packet(req);
                    break;
                case RequestType.BatchRequest:
                    throw new Error("A Batch request should not be avaible in this method.");
            }
        }
    }
}
