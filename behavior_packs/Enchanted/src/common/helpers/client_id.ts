import { murmurhash3_32_gc } from "./murmurhash";

/**
 * Returns a client id. Is not meant to be readable, but used when passing data between addons
 */
export function client_id(id: string) {
  const hash = murmurhash3_32_gc(id);
  return String.fromCharCode((hash >>> 16) & 0xffff, hash & 0xffff);
}
