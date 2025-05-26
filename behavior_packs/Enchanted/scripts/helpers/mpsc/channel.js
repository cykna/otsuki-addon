export class ChannelSender {
    constructor(queue, awaiters){
        this.queue = queue;
        this.awaiters = awaiters;
    }
    send(data) {
        if (this.awaiters.length) {
            console.log("Tx removed from queue");
            this.awaiters.shift()(data);
        } else this.queue.push(data);
    }
    clone() {
        return new ChannelSender(this.queue, this.awaiters);
    }
}
export class ChannelReceiver {
    constructor(queue, awaiters){
        this.queue = queue;
        this.awaiters = awaiters;
    }
    async recv() {
        if (this.queue.length == 0) return new Promise((ok, _)=>this.awaiters.push(ok));
        else {
            console.log("Rx got from queue");
            return this.queue.shift();
        }
    }
    async *[Symbol.asyncIterator]() {
        for(;;)yield await this.recv();
    }
}
export function channel() {
    const queue = [];
    const awaiters = [];
    return [
        new ChannelSender(queue, awaiters),
        new ChannelReceiver(queue, awaiters)
    ];
}
