import { SizedArray } from "./types";

export class Iter<T, K> {

  static from_iterable<T, K>(iter: Iterable<T, K>): Iter<T, void> {
    return Iter.from(function*() {
      yield* iter;
    });
  }

  static from<T, K, F extends (...args: any[]) => IteratorObject<T, K>>(f: F, ...args: Parameters<F>): Iter<T, K> {
    return new Iter(f.apply(null, args));
  }
  constructor(protected readonly inner: IteratorObject<T, K, any>) { }

  next() {
    return this.inner.next();
  }

  nth(n: number) {
    if (n < 0) n = -n;

    for (; ;) if (--n == 0) return this.next(); else this.next();
  }

  next_chunk<N extends number>(n: N): SizedArray<T, N> {
    const out = [] as T[];
    {
      let i = 0;
      for (const data of this.inner.take(n)) out[i++] = data;
    }
    return out as SizedArray<T, N>;
  }

  any(f: (arg: T, index: number) => boolean): boolean {
    return this.inner.some(f);
  }

  collect() {
    const out = [] as T[];
    for (const data of this.inner) out.push(data);
    return out;
  }

  collect_into(target: Array<T>) {
    for (const data of this.inner) target.push(data);
    return target;
  }

  /**
  * Iterates over this iterator and returns another one that does not end, instead repeats from the beggining.
  */
  cycle() {
    const data = this.collect();
    let i = 0;
    return new Iter(function*() {
      for (; ;) {
        yield data[i++];
        (i >= data.length) && (i = 0);
      }
    }());
  }

  enumerate(): Iter<[T, number], void> {
    const inner = this.inner;
    function* iter() {
      yield* inner.map((v, i) => [v, i] as [T, number]);
    }
    return Iter.from(iter);
  }

  filter(f: (arg: T) => boolean): Iter<T, undefined> {
    return new Iter(this.inner.filter(f));
  }

  filter_map<K>(f: (arg: T) => void | K) {
    return new FilterMap(this, f);
  }

  find(f: (arg: T, idx: number) => boolean): T | void {
    return this.inner.find(f);
  }
  find_map<K>(f: (arg: T) => K | void): K | void {
    for (const value of new FilterMap(this, f)) {
      return value;
    }
  }
  flat_map<K>(f: (arg: T, idx: number) => Iterator<K>) {
    return new Iter(this.inner.flatMap(f));
  }
  flatten<K>(this: Iter<IteratorObject<K, void>, any>): K[] {
    const out = [] as K[];
    for (const i of this.inner) {
      for (const j of i) out.push(j);
    }
    return out;
  }
  fold<K>(acc: K, f: (acc: K, arg: T) => K) {
    for (const arg of this.inner) acc = f(acc, arg);
    return acc;
  }

  map<K>(f: (arg: T) => K): MapIter<T, K> {
    return new MapIter(this, f);
  }

  map_while<K>(f: (arg: T) => K | void): MapWhile<T, K> {
    return new MapWhile(this, f);
  }

  map_windows<K, N extends number>(len: N, f: (arg: SizedArray<T, N>) => K): Iter<K, void> {
    const self = this;
    function* iter() {
      outer: for (; ;) {
        const chunk = [] as T[];
        for (let i = 0; i < len; i++) {
          const curr = self.nth(1);
          if (curr.done) break outer;
          chunk.push(curr.value);
        }
        yield f(chunk as SizedArray<T, N>);
      }
    }
    return Iter.from(iter);
  }

  for_each(f: (arg: T) => void) {
    for (const arg of this.inner) f(arg);
  }

  index(f: (arg: T) => boolean): number {
    let i = 0;
    for (const arg of this.inner) {
      i++;
      if (arg) break;
    }
    return i;
  }
  skip(n: number) {
    n = Math.abs(n);
    while (n--) this.next();
    return this;
  }

  *[Symbol.iterator]() {
    yield* this.inner;
  }
}
export class FilterMap<T, K> {

  constructor(private inner: Iter<T, any>, private f: (arg: T) => K | void) {
  }

  next() {
    const value = this.inner.next();
    const val = this.f(value.value);
    if (val) return val;
  }

  to_iter() {
    return new Iter(this[Symbol.iterator]());
  }

  *[Symbol.iterator]() {
    for (; ;) {
      let current = this.inner.next();
      if (current.done || !current.value)
        break;
      const val = this.f(current.value);
      if (val) yield val;
    }
  }
}
export class MapIter<T, K> {

  constructor(private inner: Iter<T, any>, private f: (arg: T) => K) {
  }

  next() {
    const value = this.inner.next();
    if (value.value) return this.f(value.value);
  }

  to_iter() {
    return new Iter(this[Symbol.iterator]());
  }

  *[Symbol.iterator]() {
    for (; ;) {
      let current = this.inner.next();
      if (current.done || !current.value)
        break;
      return this.f(current.value);
    }
  }
}
export class MapWhile<T, K> {

  constructor(private inner: Iter<T, any>, private f: (arg: T) => K | void) {
  }
  to_iter() {
    return new Iter(this[Symbol.iterator]());
  }
  *[Symbol.iterator]() {
    for (; ;) {
      let current = this.inner.next();
      let curr_map: void | K;
      if (current.done || !current.value || (curr_map = this.f(current.value)) == null)
        break;
      yield curr_map;
    }
  }
}
