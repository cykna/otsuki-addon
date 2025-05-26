export class ChannelSender<T> {
  constructor(private queue: T[], private awaiters: ((data: T) => void)[]) {
  }

  send(data: T) {
    if (this.awaiters.length) {
      console.log("Tx removed from queue");
      this.awaiters.shift()!(data);
    } else {
      this.queue.push(data);
    }
  }
  clone() {
    return new ChannelSender(this.queue, this.awaiters);
  }
}

export class ChannelReceiver<T> {
  constructor(private queue: T[], private awaiters: ((data: T) => void)[]) { }

  async recv(): Promise<T> {
    if (this.queue.length == 0)
      return new Promise((ok, _) => this.awaiters.push(ok));
    else {
      console.log("Rx got from queue");
      return this.queue.shift()!;
    }
  }

  async *[Symbol.asyncIterator]() {
    for (; ;) yield await this.recv();
  }
}

export function channel<T>(): [ChannelSender<T>, ChannelReceiver<T>] {
  const queue: T[] = [];
  const awaiters: ((data: T) => void)[] = [];
  return [new ChannelSender(queue, awaiters), new ChannelReceiver(queue, awaiters)];
}


