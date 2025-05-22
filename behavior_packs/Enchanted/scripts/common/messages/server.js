/**
 * A server message to the client telling it to finalize a request and handle it
 */ export class ServerFinalizeMessage {
    static from(content) {
        return new ServerFinalizeMessage(content.slice(0, 2), content.charCodeAt(2));
    }
    constructor(target, response_index){
        this.target = target;
        this.response_index = response_index;
    }
    encode() {
        return `${this.target}${String.fromCharCode(this.response_index)}`;
    }
}
/**
 * A server message to the client of a streammed part of the response
 */ export class ServerPacketMessage {
    static from(content) {
        return new ServerPacketMessage(content.slice(0, 2), content.charCodeAt(2), content.slice(3));
    }
    constructor(target, response_index, content){
        this.target = target;
        this.response_index = response_index;
        this.content = content;
    }
    //[client][req_id][content]
    encode() {
        return `${this.target}${String.fromCharCode(this.response_index)}${this.content}`;
    }
}
export class ServerBatchedMessage {
    static from(content) {
        const out = new ServerBatchedMessage(content.slice(0, 2));
        const len = content.length - 2;
        for(let i = 2; i < len;){
            const req_id = content.charCodeAt(i);
            const req_size = content.charCodeAt(i + 1);
            i += 2;
            out.response_buffer.push(String.fromCharCode(req_id) + String.fromCharCode(req_size) + content.slice(i, i + req_size + 1));
            out.responses.push({
                body: content.slice(i, i + req_size + 1),
                id: req_id
            });
            i += req_size + 1;
        }
        return out;
    }
    constructor(client_id){
        this.client_id = client_id;
        this.response_buffer = [];
        this.responses = [];
    }
    len() {
        return this.response_buffer.length;
    }
    add_response(res, id) {
        this.response_buffer.push(String.fromCharCode(id) + String.fromCharCode(res.length) + res);
    }
    //[client_id][...(id|size|req<i++>)]
    encode() {
        return `${this.client_id}${this.response_buffer.join("")}`;
    }
    /**
  * Clears the data and the responses array, not data from the message itself
  */ reset() {
        this.response_buffer.length = 0;
        this.responses.length = 0;
    }
}
export class ServerSingleResponseMessage {
    static from(content) {
        return new ServerSingleResponseMessage(content.slice(0, 2), content.charCodeAt(2), content.slice(3));
    }
    constructor(client_id, request_index, content){
        this.client_id = client_id;
        this.request_index = request_index;
        this.content = content;
    }
    //[client_id][id][data]
    encode() {
        return `${this.client_id}${String.fromCharCode(this.request_index)}${this.content}`;
    }
}
