import { system, world } from "@minecraft/server";
import { murmurhash3_32_gc } from "../common/helpers/murmurhash";
export class Caching {
    /**
  * A caching instance. Saves request bodies and the response they've got. Before the client actually request to the server, it goes checks if some request is here, if so, gets the body and don't compute the request
  */ constructor(){
        //Number is used because murmurhash will be used to hash the values.
        this.inner = new Map;
    }
    has(data) {
        const inner_data = this.inner.get(murmurhash3_32_gc(data));
        return (inner_data?.valid_time ?? 0) > system.currentTick;
    }
    get(data) {
        const key = murmurhash3_32_gc(data);
        const inner_data = this.inner.get(key);
        if ((inner_data?.valid_time ?? 0) > system.currentTick) return inner_data.data;
        if (inner_data) this.inner.delete(key);
    }
    clear() {
        this.inner.clear();
    }
    insert(key, value, duration = 20) {
        return this.inner.set(murmurhash3_32_gc(key), {
            data: value,
            valid_time: system.currentTick + duration
        });
    }
    delete(key) {
        return this.inner.delete(murmurhash3_32_gc(key));
    }
}
/**
 * Gets a 2char string from a murmurhash hash code to be used on continuous caching
 */ function murmur_str(hash) {
    return 'zethac:' + String.fromCharCode(hash >>> 16, hash & 0xffff);
}
export class ContinuousCaching {
    /**
  * Same as 'Caching' class, but Caching simply caches on that run. When the world reinitializes it loses all the caching. This continuous has overhead of world dynamicProperties but saves if even if the world is reinitialized
  */ constructor(){}
    has(data) {
        const inner = world.getDynamicProperty(murmur_str(murmurhash3_32_gc(data)));
        if (typeof inner == 'string') {
            const obj = JSON.parse(inner);
            return (obj?.valid_time ?? 0) > system.currentTick;
        }
    }
    get(data) {
        const key = murmur_str(murmurhash3_32_gc(data));
        const inner = world.getDynamicProperty(key);
        if (typeof inner == 'string') {
            const obj = JSON.parse(inner);
            if ((obj?.valid_time ?? 0) > system.currentTick) return obj.data;
            else world.setDynamicProperty(key);
        }
    }
    clear() {
        for (const prop of world.getDynamicPropertyIds())if (prop.startsWith('zethac')) world.setDynamicProperty(prop);
    }
    delete(key) {
        world.setDynamicProperty(murmur_str(murmurhash3_32_gc(key)));
    }
    insert(key, data, duration = 20) {
        world.setDynamicProperty(murmur_str(murmurhash3_32_gc(key)), JSON.stringify({
            data,
            valid_time: duration + system.currentTick
        }));
    }
}
