function header(client, server, req) {
    return client + server + String.fromCharCode(req);
}
/**
 * A client message to the server of requesting initialization
 */ export class ClientInitializationMessage {
    static from(content) {
        return new ClientFinalizationMessage(content.slice(0, 2), content.slice(2, 4), content.charCodeAt(4));
    }
    constructor(client_id, server_id, request_index){
        this.client_id = client_id;
        this.server_id = server_id;
        this.request_index = request_index;
    }
    /**
   * Encodes this Message into a single message. It's defined as
   * [2c:CLIENT_ID][2c:SERVER_ID][1c:REQUEST_INDEX].
   * Obs: Nc = N chars.
   */ encode() {
        return this.client_id + this.server_id + String.fromCharCode(this.request_index);
    }
}
/**
 * A client message to the server of a streammed part of the packet.
 */ export class ClientPacketMessage {
    static from(content) {
        return new ClientPacketMessage(content.slice(0, 2), content.slice(2, 4), content.slice(5), content.charCodeAt(4));
    }
    constructor(client_id, server_id, content, request_index){
        this.client_id = client_id;
        this.server_id = server_id;
        this.content = content;
        this.request_index = request_index;
    }
    /**
   * Encodes this Message into a single message. It's defined as
   * [2c:CLIENT_ID][2c:SERVER_ID][1c:REQUEST_INDEX][Nc:PACKET].
   * Obs: Nc = N chars.
   */ encode() {
        return `${header(this.client_id, this.server_id, this.request_index)}${this.content}`;
    }
}
/**
 * A client message to the server saying the request finalized
 */ export class ClientFinalizationMessage {
    static from(content) {
        return new ClientFinalizationMessage(content.slice(0, 2), content.slice(2, 4), content.charCodeAt(4));
    }
    constructor(client_id, server_id, request_index){
        this.client_id = client_id;
        this.server_id = server_id;
        this.request_index = request_index;
    }
    encode() {
        return this.client_id + this.server_id + String.fromCharCode(this.request_index);
    }
}
export class ClientBatchMessage {
    static from(content) {
        const out = new ClientBatchMessage(content.slice(0, 2), content.slice(2, 4));
        const len = content.length;
        for(let i = 4; i < len;){
            const req_size = content.charCodeAt(i);
            const req_id = content.charCodeAt(i + 1);
            out.requests.push({
                body: content.slice(i + 2, i + 2 + req_size),
                id: req_id
            });
            i += req_size;
        }
        return out;
    }
    constructor(client_id, server_id){
        this.client_id = client_id;
        this.server_id = server_id;
        this.request_buffer = [];
        this.requests = [];
    }
    /**
   * The length of requests stored in the internal buffer. Does not represent the actual requests that can be read, but in fact, the stored ones to be sent.
   */ len() {
        return this.request_buffer.length;
    }
    add_request(req, id) {
        this.request_buffer.push(String.fromCharCode(req.length) + String.fromCharCode(id) + req);
    }
    encode() {
        return `${this.client_id}${this.server_id}${this.request_buffer}`;
    }
    /**
  * Clears the internal buffer and the requests array. Not data from the message itself
  */ clear() {
        this.request_buffer = [];
        this.requests.length = 0;
    }
}
export class ClientSingleResquestMessage {
    static from(content) {
        const out = new ClientSingleResquestMessage(content.slice(0, 2), content.slice(2, 4), content.charCodeAt(4));
        out.content = content.slice(5);
        return out;
    }
    constructor(client_id, server_id, request_index){
        this.client_id = client_id;
        this.server_id = server_id;
        this.request_index = request_index;
        this.content = "";
    }
    encode() {
        return header(this.client_id, this.server_id, this.request_index) + this.content;
    }
}
