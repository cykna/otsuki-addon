export type SizedArray<T, N extends number, Init extends unknown[] = []> = Init['length'] extends N ? Init : SizedArray<T, N, [...Init, T]>;
export type AsyncIterFrom<F> = F extends (...args: any[]) => AsyncIteratorObject<infer T, infer K> ? [T, K] : [unknown, unknown];


