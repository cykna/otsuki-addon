var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __legacyDecorateClassTS = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
    r = Reflect.decorate(decorators, target, key, desc);
  else
    for (var i = decorators.length - 1;i >= 0; i--)
      if (d = decorators[i])
        r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};

// ../../../../node_modules/lz-string/libs/lz-string.js
var require_lz_string = __commonJS((exports, module) => {
  var LZString = function() {
    var f = String.fromCharCode;
    var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
    var baseReverseDic = {};
    function getBaseValue(alphabet, character) {
      if (!baseReverseDic[alphabet]) {
        baseReverseDic[alphabet] = {};
        for (var i = 0;i < alphabet.length; i++) {
          baseReverseDic[alphabet][alphabet.charAt(i)] = i;
        }
      }
      return baseReverseDic[alphabet][character];
    }
    var LZString2 = {
      compressToBase64: function(input) {
        if (input == null)
          return "";
        var res = LZString2._compress(input, 6, function(a) {
          return keyStrBase64.charAt(a);
        });
        switch (res.length % 4) {
          default:
          case 0:
            return res;
          case 1:
            return res + "===";
          case 2:
            return res + "==";
          case 3:
            return res + "=";
        }
      },
      decompressFromBase64: function(input) {
        if (input == null)
          return "";
        if (input == "")
          return null;
        return LZString2._decompress(input.length, 32, function(index) {
          return getBaseValue(keyStrBase64, input.charAt(index));
        });
      },
      compressToUTF16: function(input) {
        if (input == null)
          return "";
        return LZString2._compress(input, 15, function(a) {
          return f(a + 32);
        }) + " ";
      },
      decompressFromUTF16: function(compressed) {
        if (compressed == null)
          return "";
        if (compressed == "")
          return null;
        return LZString2._decompress(compressed.length, 16384, function(index) {
          return compressed.charCodeAt(index) - 32;
        });
      },
      compressToUint8Array: function(uncompressed) {
        var compressed = LZString2.compress(uncompressed);
        var buf = new Uint8Array(compressed.length * 2);
        for (var i = 0, TotalLen = compressed.length;i < TotalLen; i++) {
          var current_value = compressed.charCodeAt(i);
          buf[i * 2] = current_value >>> 8;
          buf[i * 2 + 1] = current_value % 256;
        }
        return buf;
      },
      decompressFromUint8Array: function(compressed) {
        if (compressed === null || compressed === undefined) {
          return LZString2.decompress(compressed);
        } else {
          var buf = new Array(compressed.length / 2);
          for (var i = 0, TotalLen = buf.length;i < TotalLen; i++) {
            buf[i] = compressed[i * 2] * 256 + compressed[i * 2 + 1];
          }
          var result = [];
          buf.forEach(function(c) {
            result.push(f(c));
          });
          return LZString2.decompress(result.join(""));
        }
      },
      compressToEncodedURIComponent: function(input) {
        if (input == null)
          return "";
        return LZString2._compress(input, 6, function(a) {
          return keyStrUriSafe.charAt(a);
        });
      },
      decompressFromEncodedURIComponent: function(input) {
        if (input == null)
          return "";
        if (input == "")
          return null;
        input = input.replace(/ /g, "+");
        return LZString2._decompress(input.length, 32, function(index) {
          return getBaseValue(keyStrUriSafe, input.charAt(index));
        });
      },
      compress: function(uncompressed) {
        return LZString2._compress(uncompressed, 16, function(a) {
          return f(a);
        });
      },
      _compress: function(uncompressed, bitsPerChar, getCharFromInt) {
        if (uncompressed == null)
          return "";
        var i, value, context_dictionary = {}, context_dictionaryToCreate = {}, context_c = "", context_wc = "", context_w = "", context_enlargeIn = 2, context_dictSize = 3, context_numBits = 2, context_data = [], context_data_val = 0, context_data_position = 0, ii;
        for (ii = 0;ii < uncompressed.length; ii += 1) {
          context_c = uncompressed.charAt(ii);
          if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
            context_dictionary[context_c] = context_dictSize++;
            context_dictionaryToCreate[context_c] = true;
          }
          context_wc = context_w + context_c;
          if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
            context_w = context_wc;
          } else {
            if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
              if (context_w.charCodeAt(0) < 256) {
                for (i = 0;i < context_numBits; i++) {
                  context_data_val = context_data_val << 1;
                  if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                }
                value = context_w.charCodeAt(0);
                for (i = 0;i < 8; i++) {
                  context_data_val = context_data_val << 1 | value & 1;
                  if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                  value = value >> 1;
                }
              } else {
                value = 1;
                for (i = 0;i < context_numBits; i++) {
                  context_data_val = context_data_val << 1 | value;
                  if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                  value = 0;
                }
                value = context_w.charCodeAt(0);
                for (i = 0;i < 16; i++) {
                  context_data_val = context_data_val << 1 | value & 1;
                  if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                  value = value >> 1;
                }
              }
              context_enlargeIn--;
              if (context_enlargeIn == 0) {
                context_enlargeIn = Math.pow(2, context_numBits);
                context_numBits++;
              }
              delete context_dictionaryToCreate[context_w];
            } else {
              value = context_dictionary[context_w];
              for (i = 0;i < context_numBits; i++) {
                context_data_val = context_data_val << 1 | value & 1;
                if (context_data_position == bitsPerChar - 1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = value >> 1;
              }
            }
            context_enlargeIn--;
            if (context_enlargeIn == 0) {
              context_enlargeIn = Math.pow(2, context_numBits);
              context_numBits++;
            }
            context_dictionary[context_wc] = context_dictSize++;
            context_w = String(context_c);
          }
        }
        if (context_w !== "") {
          if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
            if (context_w.charCodeAt(0) < 256) {
              for (i = 0;i < context_numBits; i++) {
                context_data_val = context_data_val << 1;
                if (context_data_position == bitsPerChar - 1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
              }
              value = context_w.charCodeAt(0);
              for (i = 0;i < 8; i++) {
                context_data_val = context_data_val << 1 | value & 1;
                if (context_data_position == bitsPerChar - 1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = value >> 1;
              }
            } else {
              value = 1;
              for (i = 0;i < context_numBits; i++) {
                context_data_val = context_data_val << 1 | value;
                if (context_data_position == bitsPerChar - 1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = 0;
              }
              value = context_w.charCodeAt(0);
              for (i = 0;i < 16; i++) {
                context_data_val = context_data_val << 1 | value & 1;
                if (context_data_position == bitsPerChar - 1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = value >> 1;
              }
            }
            context_enlargeIn--;
            if (context_enlargeIn == 0) {
              context_enlargeIn = Math.pow(2, context_numBits);
              context_numBits++;
            }
            delete context_dictionaryToCreate[context_w];
          } else {
            value = context_dictionary[context_w];
            for (i = 0;i < context_numBits; i++) {
              context_data_val = context_data_val << 1 | value & 1;
              if (context_data_position == bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          }
          context_enlargeIn--;
          if (context_enlargeIn == 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
          }
        }
        value = 2;
        for (i = 0;i < context_numBits; i++) {
          context_data_val = context_data_val << 1 | value & 1;
          if (context_data_position == bitsPerChar - 1) {
            context_data_position = 0;
            context_data.push(getCharFromInt(context_data_val));
            context_data_val = 0;
          } else {
            context_data_position++;
          }
          value = value >> 1;
        }
        while (true) {
          context_data_val = context_data_val << 1;
          if (context_data_position == bitsPerChar - 1) {
            context_data.push(getCharFromInt(context_data_val));
            break;
          } else
            context_data_position++;
        }
        return context_data.join("");
      },
      decompress: function(compressed) {
        if (compressed == null)
          return "";
        if (compressed == "")
          return null;
        return LZString2._decompress(compressed.length, 32768, function(index) {
          return compressed.charCodeAt(index);
        });
      },
      _decompress: function(length, resetValue, getNextValue) {
        var dictionary = [], next, enlargeIn = 4, dictSize = 4, numBits = 3, entry = "", result = [], i, w, bits, resb, maxpower, power, c, data = { val: getNextValue(0), position: resetValue, index: 1 };
        for (i = 0;i < 3; i += 1) {
          dictionary[i] = i;
        }
        bits = 0;
        maxpower = Math.pow(2, 2);
        power = 1;
        while (power != maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position == 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        switch (next = bits) {
          case 0:
            bits = 0;
            maxpower = Math.pow(2, 8);
            power = 1;
            while (power != maxpower) {
              resb = data.val & data.position;
              data.position >>= 1;
              if (data.position == 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
              }
              bits |= (resb > 0 ? 1 : 0) * power;
              power <<= 1;
            }
            c = f(bits);
            break;
          case 1:
            bits = 0;
            maxpower = Math.pow(2, 16);
            power = 1;
            while (power != maxpower) {
              resb = data.val & data.position;
              data.position >>= 1;
              if (data.position == 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
              }
              bits |= (resb > 0 ? 1 : 0) * power;
              power <<= 1;
            }
            c = f(bits);
            break;
          case 2:
            return "";
        }
        dictionary[3] = c;
        w = c;
        result.push(c);
        while (true) {
          if (data.index > length) {
            return "";
          }
          bits = 0;
          maxpower = Math.pow(2, numBits);
          power = 1;
          while (power != maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          switch (c = bits) {
            case 0:
              bits = 0;
              maxpower = Math.pow(2, 8);
              power = 1;
              while (power != maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
              }
              dictionary[dictSize++] = f(bits);
              c = dictSize - 1;
              enlargeIn--;
              break;
            case 1:
              bits = 0;
              maxpower = Math.pow(2, 16);
              power = 1;
              while (power != maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
              }
              dictionary[dictSize++] = f(bits);
              c = dictSize - 1;
              enlargeIn--;
              break;
            case 2:
              return result.join("");
          }
          if (enlargeIn == 0) {
            enlargeIn = Math.pow(2, numBits);
            numBits++;
          }
          if (dictionary[c]) {
            entry = dictionary[c];
          } else {
            if (c === dictSize) {
              entry = w + w.charAt(0);
            } else {
              return null;
            }
          }
          result.push(entry);
          dictionary[dictSize++] = w + entry.charAt(0);
          enlargeIn--;
          w = entry;
          if (enlargeIn == 0) {
            enlargeIn = Math.pow(2, numBits);
            numBits++;
          }
        }
      }
    };
    return LZString2;
  }();
  if (typeof define === "function" && define.amd) {
    define(function() {
      return LZString;
    });
  } else if (typeof module !== "undefined" && module != null) {
    module.exports = LZString;
  } else if (typeof angular !== "undefined" && angular != null) {
    angular.module("LZString", []).factory("LZString", function() {
      return LZString;
    });
  }
});

// src/main.ts
import { world as world3 } from "@minecraft/server";

// src/server/Response.ts
class ErrorResponse {
  value;
  error = true;
  constructor(value) {
    this.value = value;
  }
  toJSON() {
    return {
      error: true,
      value: this.value.toString()
    };
  }
}

// src/server/server.ts
var import_lz_string2 = __toESM(require_lz_string(), 1);
import { system as system3 } from "@minecraft/server";

// src/server/decorators.ts
import { system } from "@minecraft/server";
function ImplEnchantedServer(constructor) {
  system.afterEvents.scriptEventReceive.subscribe((e) => {
    switch (e.id) {
      case "enchanted:request": {
        const split = e.message.split("\x01");
        if (split[1] == constructor.running_server?.config.uuid)
          if (constructor.requests.has(split[0])) {
            constructor.requests.get(split[0]).push({ content: "", finalized: false });
          } else {
            constructor.requests.set(split[0], [{ content: "", finalized: false }]);
          }
        break;
      }
      case "enchanted:request_data": {
        const splitted = e.message.split("\x01");
        if (splitted[1] != constructor.running_server?.config.uuid)
          return;
        const first = splitted[0];
        if (!constructor.requests.has(first))
          throw new Error(`Not a recognized uuid: ${first}`);
        if (constructor.running_server?.config.uuid != splitted[1])
          break;
        const idx = parseInt(splitted[2]);
        constructor.requests.get(first)[idx].content += splitted[3];
        break;
      }
      case "enchanted:finalize_request": {
        const splitted = e.message.split("\x01");
        if (constructor.running_server?.config.uuid != splitted[1])
          return;
        const first = splitted[0];
        const idx = parseInt(splitted[2]);
        const request = constructor.requests.get(first);
        if (!request)
          throw new Error(`Not a recognized uuid: ${first}`);
        system.runJob(constructor.handle(request[idx].content, first, idx));
        request[idx].finalized = true;
        if (request.every((e2) => e2.finalized)) {
          constructor.requests.delete(first);
          constructor.request_reset_index(first);
        }
        break;
      }
    }
  });
}

// src/client/client.ts
var import_lz_string = __toESM(require_lz_string(), 1);
import { system as system2, world } from "@minecraft/server";

class EnchantedClient {
  config;
  request_idx = 0;
  responses = [];
  ok_promises = [];
  constructor(config) {
    this.config = config;
    system2.afterEvents.scriptEventReceive.subscribe((e) => {
      if (e.id == "enchanted:response") {
        if (e.message == this.config.uuid)
          this.responses.push("");
      } else if (e.id == "enchanted:response_data") {
        const splitted = e.message.split("\x01");
        if (splitted[0] == this.config.uuid)
          this.responses[splitted[1]] += splitted[2];
      } else if (e.id == "enchanted:response_end") {
        const splitted = e.message.split("\x01");
        if (splitted[0] == this.config.uuid) {
          const decompressed = import_lz_string.decompress(this.responses[splitted[1]]);
          this.ok_promises[splitted[1]](decompressed);
          this.handle_response(decompressed, parseInt(splitted[1]));
        }
      } else if (e.id == "enchanted:request_reset" && this.config.uuid == e.message) {
        this.request_idx = 0;
      }
    });
  }
  initialize_request() {
    this.request_idx++;
    system2.sendScriptEvent("enchanted:request", this.config.uuid + "\x01" + this.config.target);
  }
  *make_request(content) {
    const splitlen = Math.min(this.config.piece_len, 2048);
    const header = `${this.config.uuid}\x01${this.config.target}\x01${this.request_idx}\x01`;
    const id = this.request_idx;
    const compressed = import_lz_string.compress(content);
    this.initialize_request();
    for (let i = 0, j = compressed.length;i < j; i += splitlen)
      yield system2.sendScriptEvent("enchanted:request_data", header + compressed.substring(i, i + Math.min(splitlen, j - i)));
    this.finalize_request(id);
  }
  finalize_request(id) {
    system2.sendScriptEvent("enchanted:finalize_request", `${this.config.uuid}\x01${this.config.target}\x01${id}`);
  }
  send_raw(data) {
    if (this.config.target)
      return new Promise((ok, err) => {
        this.ok_promises[this.request_idx] = ok;
        system2.runJob(this.make_request(data));
      });
    return new Promise((_, err) => err(new Error("Client does not have a target")));
  }
  async send_object(obj) {
    return JSON.parse(await this.send_raw(JSON.stringify(obj)));
  }
  handle_response(content, id) {
    world.sendMessage("Received: " + content + " from id: " + id);
  }
}

// src/server/server.ts
class EnchantedServer extends EnchantedClient {
  static running_server = null;
  static request_reset_index(uuid) {
    system3.sendScriptEvent("enchanted:request_reset", uuid);
  }
  static *send_response(req, target, id) {
    const compressed = import_lz_string2.compress(req);
    const header = `${target}\x01${id}\x01`;
    for (let i = 0, j = compressed.length;i < j; i += 2048)
      yield system3.sendScriptEvent("enchanted:response_data", header + compressed.substring(i, i + Math.min(2048, j - i)));
  }
  static *handle(request, target, id) {
    if (this.running_server == null)
      throw new Error("No Server is running to send a response. Error on server implementation");
    const decompressed = import_lz_string2.decompress(request);
    yield system3.sendScriptEvent("enchanted:response", target);
    yield* this.send_response(this.running_server.handle_request(decompressed, target, id), target, id);
    yield system3.sendScriptEvent("enchanted:response_end", `${target}\x01${id}`);
  }
  static requests = new Map;
  constructor(config) {
    super(config);
    EnchantedServer.running_server = this;
  }
  handle_request(req, client, req_id) {
    const data = this.handle(JSON.parse(req), client, req_id);
    return JSON.stringify(data);
  }
  handle(obj, client, req_id) {
    return "Todo! Enchanted Server default handle function is meant to be overwritten";
  }
}
EnchantedServer = __legacyDecorateClassTS([
  ImplEnchantedServer
], EnchantedServer);

// src/server/routed_server.ts
class RouteServer extends EnchantedServer {
  routes = new Map;
  constructor(config) {
    super(config);
  }
  route(route, fn) {
    if (route == "/")
      return this.routes.set("/", {
        route: fn,
        subroutes: new Map
      }), this;
    const split = route.split("/");
    split.shift();
    const last = split.pop();
    let current = this.routes;
    for (const path of split) {
      current.set(path, {
        subroutes: current = new Map
      });
    }
    current.set(last, {
      subroutes: new Map,
      route: fn
    });
    return this;
  }
  handle(obj, target, id) {
    if (obj.route == "/" && this.routes.has("/")) {
      return {
        error: false,
        value: this.routes.get("/").route?.([], target, id, new Map)
      };
    }
    const pathname = obj.route.split("/");
    pathname.shift();
    let lastpath = pathname.pop();
    let current = this.routes;
    const params = [];
    for (const path of pathname) {
      if (current.has(path))
        current = current.get(path).subroutes;
      else if (current.has("dynroute")) {
        current = current.get("dynroute").subroutes;
      } else {
        return new ErrorResponse(new Error("Not a valid route named: " + obj.route));
      }
    }
    const last = current.get(lastpath) ?? (current.has("dynroute") && params.push(lastpath), current.get("dynroute"));
    if (!last?.route) {
      return new ErrorResponse(new Error("Not a valid route named: " + obj.route));
    }
    return {
      error: false,
      value: last.route(params, target, id, new Map)
    };
  }
}

// src/main.ts
world3.afterEvents.worldLoad.subscribe((e) => {
  world3.setDynamicProperty(Math.random().toString(), Math.random());
});
new RouteServer({
  uuid: "enchanted",
  piece_len: 2048
}).route("/", () => {
  world3.sendMessage("Vai pro cacete");
}).route("/seugay", () => {
  world3.sendMessage("É você que é");
});
