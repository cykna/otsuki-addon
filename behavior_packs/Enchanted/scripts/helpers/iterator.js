export class Iter {
    static from_iterable(iter) {
        return Iter.from(function*() {
            yield* iter;
        });
    }
    static from(f, ...args) {
        return new Iter(f.apply(null, args));
    }
    constructor(inner){
        this.inner = inner;
    }
    next() {
        return this.inner.next();
    }
    nth(n) {
        if (n < 0) n = -n;
        for(;;)if (--n == 0) return this.next();
        else this.next();
    }
    next_chunk(n) {
        const out = [];
        {
            let i = 0;
            for (const data of this.inner.take(n))out[i++] = data;
        }
        return out;
    }
    any(f) {
        return this.inner.some(f);
    }
    collect() {
        const out = [];
        for (const data of this.inner)out.push(data);
        return out;
    }
    collect_into(target) {
        for (const data of this.inner)target.push(data);
        return target;
    }
    /**
  * Iterates over this iterator and returns another one that does not end, instead repeats from the beggining.
  */ cycle() {
        const data = this.collect();
        let i = 0;
        return new Iter(function*() {
            for(;;){
                yield data[i++];
                i >= data.length && (i = 0);
            }
        }());
    }
    enumerate() {
        const inner = this.inner;
        function* iter() {
            yield* inner.map((v, i)=>[
                    v,
                    i
                ]);
        }
        return Iter.from(iter);
    }
    filter(f) {
        return new Iter(this.inner.filter(f));
    }
    filter_map(f) {
        return new FilterMap(this, f);
    }
    find(f) {
        return this.inner.find(f);
    }
    find_map(f) {
        for (const value of new FilterMap(this, f))return value;
    }
    flat_map(f) {
        return new Iter(this.inner.flatMap(f));
    }
    flatten() {
        const out = [];
        for (const i of this.inner)for (const j of i)out.push(j);
        return out;
    }
    fold(acc, f) {
        for (const arg of this.inner)acc = f(acc, arg);
        return acc;
    }
    map(f) {
        return new MapIter(this, f);
    }
    map_while(f) {
        return new MapWhile(this, f);
    }
    map_windows(len, f) {
        const self = this;
        function* iter() {
            outer: for(;;){
                const chunk = [];
                for(let i = 0; i < len; i++){
                    const curr = self.nth(1);
                    if (curr.done) break outer;
                    chunk.push(curr.value);
                }
                yield f(chunk);
            }
        }
        return Iter.from(iter);
    }
    for_each(f) {
        for (const arg of this.inner)f(arg);
    }
    index(f) {
        let i = 0;
        for (const arg of this.inner){
            i++;
            if (arg) break;
        }
        return i;
    }
    skip(n) {
        n = Math.abs(n);
        while(n--)this.next();
        return this;
    }
    *[Symbol.iterator]() {
        yield* this.inner;
    }
}
export class FilterMap {
    constructor(inner, f){
        this.inner = inner;
        this.f = f;
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
        for(;;){
            let current = this.inner.next();
            if (current.done || !current.value) break;
            const val = this.f(current.value);
            if (val) yield val;
        }
    }
}
export class MapIter {
    constructor(inner, f){
        this.inner = inner;
        this.f = f;
    }
    next() {
        const value = this.inner.next();
        if (value.value) return this.f(value.value);
    }
    to_iter() {
        return new Iter(this[Symbol.iterator]());
    }
    *[Symbol.iterator]() {
        for(;;){
            let current = this.inner.next();
            if (current.done || !current.value) break;
            return this.f(current.value);
        }
    }
}
export class MapWhile {
    constructor(inner, f){
        this.inner = inner;
        this.f = f;
    }
    to_iter() {
        return new Iter(this[Symbol.iterator]());
    }
    *[Symbol.iterator]() {
        for(;;){
            let current = this.inner.next();
            let curr_map;
            if (current.done || !current.value || (curr_map = this.f(current.value)) == null) break;
            yield curr_map;
        }
    }
}
