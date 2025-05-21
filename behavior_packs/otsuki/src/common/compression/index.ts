import { decode, encode } from "cbor-x";
import { TextEncoder } from "fast-text-encoding";
import { compress as lzcompress, decompress as lzdecompress } from "lz-string";
import pako from "pako";

globalThis.TextEncoder ??= TextEncoder;

export { lzcompress, lzdecompress };

export const enum CompressionMethod {
  Lz = "L", CborPako = "C"
}

export function compress(data: string) {
  const value = data.length < 512 ? `${CompressionMethod.Lz}${lzcompress(data)}` : `${CompressionMethod.CborPako}${compress_cbor_pako(data)}`;
  return value;
}
export function decompress(data: string) {
  const last = data[0];
  if (last == CompressionMethod.Lz) return lzdecompress(data.slice(1))
  else if (last == CompressionMethod.CborPako) return decompress_cbor_pako(data.slice(1, 0));
  else throw new Error(`Invalid compression method '${last}'. Use 1 for Lz and 2 for Cbor + Pako`);
}

/**
  * Encodes the given data with cbor, then deflates it and compresses it into a single string.
  */
export function compress_cbor_pako(data: any): string {
  const encoded = encode(data);
  const pako_packet = pako.deflate(encoded);
  const len = Math.ceil(pako_packet.length * 0.5);
  const out = new Uint16Array(len);
  for (let i = 0, j = 0; i < len; i++, j += 2) out[i] = pako_packet[j] << 8 | (pako_packet[j + 1] ?? 0);
  return String.fromCharCode(...out);
}

/**
  * 'data' argument is expected to be result from compress_cbor_pako. It decompress the data, inflates it and decodes returning the original value
*/
export function decompress_cbor_pako(data: string) {
  const out: number[] = [];
  for (let i = 0, j = data.length; i < j; i++) {
    const code = data.charCodeAt(i);
    out[i << 1] = (code >> 8) & 0xff;
    out[(i << 1) + 1] = code & 0xff;
  }
  return decode(pako.inflate(new Uint8Array(out)));
}
