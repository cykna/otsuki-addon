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
import { world as world2 } from "@minecraft/server";

// src/client/client.ts
var import_lz_string = __toESM(require_lz_string(), 1);
import { system } from "@minecraft/server";

// src/client/message.ts
class ClientInitializationMessage {
  client_id;
  server_id;
  request_index;
  constructor(client_id, server_id, request_index) {
    this.client_id = client_id;
    this.server_id = server_id;
    this.request_index = request_index;
  }
  encode() {
    return `${this.client_id}\x01${this.server_id}\x01${this.request_index}`;
  }
  decode(content) {
    const splitted = content.split("\x01", 3);
    this.client_id = splitted[0];
    this.server_id = splitted[1];
    this.request_index = parseInt(splitted[2]);
  }
}

class ClientPacketMessage {
  server_id;
  client_id;
  content;
  request_index;
  header;
  constructor(server_id, client_id, content, request_index) {
    this.server_id = server_id;
    this.client_id = client_id;
    this.content = content;
    this.request_index = request_index;
    this.header = `${this.client_id}\x01${this.server_id}\x01${this.request_index}\x01`;
  }
  encode() {
    return `${this.header}${this.content}`;
  }
  decode(content) {
    const splitted = content.split("\x01", 4);
    this.client_id = splitted[0];
    this.server_id = splitted[1];
    this.request_index = parseInt(splitted[2]);
    this.content = splitted[3];
  }
}

class ClientFinalizationMessage {
  client_id;
  server_id;
  request_index;
  constructor(client_id, server_id, request_index) {
    this.client_id = client_id;
    this.server_id = server_id;
    this.request_index = request_index;
  }
  encode() {
    return `${this.client_id}\x01${this.server_id}\x01${this.request_index}`;
  }
  decode(content) {
    const splitted = content.split("\x01", 3);
    this.client_id = splitted[0];
    this.server_id = splitted[1];
    this.request_index = parseInt(splitted[2]);
  }
}

class ClientBatchMessage {
  client_id;
  server_id;
  request_buffer = "";
  requests = [];
  constructor(client_id, server_id) {
    this.client_id = client_id;
    this.server_id = server_id;
  }
  len() {
    return this.request_buffer.length;
  }
  add_request(req, id) {
    if (this.request_buffer == "")
      this.request_buffer = req + "\x03" + id;
    else
      this.request_buffer += "\x02" + req + "\x03" + id;
  }
  encode() {
    return `${this.request_buffer}\x01${this.client_id}\x01${this.server_id}`;
  }
  decode(content) {
    const [requests, client, server] = content.split("\x01", 3);
    this.client_id = client;
    this.server_id = server;
    this.requests = requests.split("\x02").map((req) => {
      const [body, id] = req.split("\x03");
      return {
        body,
        id: parseInt(id)
      };
    });
  }
  clear() {
    this.request_buffer = "";
    this.requests.length = 0;
  }
}

// src/server/message.ts
class ServerFinalizeMessage {
  target;
  response_index;
  constructor(target, response_index) {
    this.target = target;
    this.response_index = response_index;
  }
  encode() {
    return `${this.target}\x01${this.response_index}`;
  }
  decode(content) {
    const splitted = content.split("\x01", 2);
    this.target = splitted[0];
    this.response_index = parseInt(splitted[1]);
  }
}

class ServerPacketMessage {
  target;
  response_index;
  content;
  header;
  constructor(target, response_index, content) {
    this.target = target;
    this.response_index = response_index;
    this.content = content;
    this.header = this.target + "\x01" + this.response_index + "\x01";
  }
  encode() {
    return `${this.header}${this.content}`;
  }
  decode(content) {
    const splitted = content.split("\x01", 3);
    this.target = splitted[0];
    this.response_index = parseInt(splitted[1]);
    this.content = splitted[2];
  }
}

class ServerBatchedMessage {
  client_id;
  response_buffer = "";
  responses = [];
  constructor(client_id) {
    this.client_id = client_id;
  }
  len() {
    return this.response_buffer.length;
  }
  add_response(res, id) {
    if (this.response_buffer == "")
      this.response_buffer = res + "\x03" + id;
    else
      this.response_buffer += "\x02" + res + "\x03" + id;
  }
  encode() {
    return `${this.client_id}\x01${this.response_buffer}`;
  }
  decode(content) {
    const [client_id, batch_content] = content.split("\x01", 2);
    this.client_id = client_id;
    this.responses = batch_content.split("\x02").map((res) => {
      const [body, id] = res.split("\x03", 2);
      return {
        body,
        id: parseInt(id)
      };
    });
  }
  reset() {
    this.responses.length = 0;
    this.response_buffer = "";
  }
}

// src/common/constants.ts
var RequestConstants;
((RequestConstants) => {
  RequestConstants.SIZE_LIMIT = 2048;
  RequestConstants.APPROXIMATED_UNCOMPRESSED_LIMIT = 2048 * 1.3;
  RequestConstants.REQUEST_AMOUNT_LIMIT = 4096;
})(RequestConstants ||= {});

// src/client/client.ts
class EnchantedClient {
  config;
  batch_message;
  request_idx = 0;
  responses = new Map;
  constructor(config) {
    this.config = config;
    this.batch_message = new ClientBatchMessage(config.uuid, config.target);
    system.afterEvents.scriptEventReceive.subscribe((e) => {
      switch (e.id) {
        case "enchanted:response_data" /* PacketData */: {
          const server_message = new ServerPacketMessage("", 0, "");
          server_message.decode(e.message);
          this.receive_packet(server_message);
          break;
        }
        case "enchanted:response_end" /* Finalization */: {
          const message = new ServerFinalizeMessage("", 0);
          message.decode(e.message);
          this.receive_finalization(message);
          break;
        }
        case "enchantend:batch_response" /* BatchResponse */: {
          const message = new ServerBatchedMessage("");
          const decompressed = import_lz_string.decompress(e.message);
          message.decode(decompressed);
          this.receive_batch(message);
        }
      }
    });
  }
  receive_batch(message) {
    if (message.client_id != this.config.uuid)
      return false;
    for (const response of message.responses) {
      const res = this.responses.get(response.id);
      if (!res)
        return;
      res.ok(response.body);
      this.responses.delete(response.id);
      this.handle_response(response.body, response.id);
    }
  }
  receive_packet(message) {
    if (message.target != this.config.uuid)
      return false;
    this.responses.get(message.response_index).body += message.content;
    return true;
  }
  handle_indexed_response(index) {
    const res = this.responses.get(index);
    if (!res)
      return;
    const decompressed = import_lz_string.decompress(res.body);
    res.ok(decompressed);
    this.responses.delete(index);
    this.handle_response(decompressed, index);
  }
  receive_finalization(message) {
    if (message.target != this.config.uuid)
      return false;
    this.handle_indexed_response(message.response_index);
    return true;
  }
  initialize_request() {
    const message = new ClientInitializationMessage(this.config.uuid, this.config.target, this.request_idx);
    system.sendScriptEvent("enchanted:request" /* Initialization */, message.encode());
  }
  *make_request(content) {
    const splitlen = Math.min(this.config.piece_len, RequestConstants.SIZE_LIMIT);
    const compressed = import_lz_string.compress(content);
    const id = this.request_idx;
    this.initialize_request();
    const message = new ClientPacketMessage(this.config.target, this.config.uuid, "", this.request_idx);
    this.request_idx = (this.request_idx + 1) % RequestConstants.REQUEST_AMOUNT_LIMIT;
    for (let i = 0, j = compressed.length;i < j; ) {
      message.content = compressed.substring(i, i += splitlen);
      yield system.sendScriptEvent("enchanted:request_data" /* PacketData */, message.encode());
    }
    this.finalize_request(id);
  }
  make_request_blocking(content) {
    const splitlen = Math.min(this.config.piece_len, RequestConstants.SIZE_LIMIT);
    const compressed = import_lz_string.compress(content);
    const id = this.request_idx;
    this.initialize_request();
    const message = new ClientPacketMessage(this.config.target, this.config.uuid, "", this.request_idx);
    this.request_idx = (this.request_idx + 1) % RequestConstants.REQUEST_AMOUNT_LIMIT;
    for (let i = 0, j = compressed.length;i < j; ) {
      message.content = compressed.substring(i, i += splitlen);
      system.sendScriptEvent("enchanted:request_data" /* PacketData */, message.encode());
    }
    this.finalize_request(id);
  }
  finalize_request(id) {
    const message = new ClientFinalizationMessage(this.config.uuid, this.config.target, id).encode();
    system.sendScriptEvent("enchanted:finalize_request" /* Finalization */, message);
  }
  batch_requests_blocking() {
    const encoded = this.batch_message.encode();
    const compressed = import_lz_string.compress(encoded);
    system.sendScriptEvent("enchanted:batch_request" /* BatchRequest */, compressed);
  }
  send_raw(data) {
    if (!this.config.target)
      return new Promise((_, err) => err(new Error("Client does not have a target")));
    if (this.config.batch_request) {
      if (this.batch_message.len() + data.length + 1 < RequestConstants.APPROXIMATED_UNCOMPRESSED_LIMIT) {
        this.batch_message.add_request(data, this.request_idx);
        return new Promise((ok, _) => {
          this.responses.set(this.request_idx, { ok, body: "" });
          this.request_idx = (this.request_idx + 1) % RequestConstants.REQUEST_AMOUNT_LIMIT;
        });
      } else {
        this.batch_requests_blocking();
        this.batch_message.clear();
        this.batch_message.add_request(data, this.request_idx);
        return new Promise((ok, _) => {
          this.responses.set(this.request_idx, { ok, body: "" });
          this.request_idx = (this.request_idx + 1) % RequestConstants.REQUEST_AMOUNT_LIMIT;
        });
      }
    }
    return new Promise((ok, _) => {
      this.responses.set(this.request_idx, { ok, body: "" });
      this.make_request_blocking(data);
    });
  }
  async send_object(obj) {
    return JSON.parse(await this.send_raw(JSON.stringify(obj)));
  }
  handle_response(content, id) {
  }
}

// src/main.ts
var client = new EnchantedClient({
  target: "enchanted",
  piece_len: 2048,
  uuid: "seupai",
  batch_request: true
});
world2.afterEvents.playerBreakBlock.subscribe(async (e) => {
  let i = 0;
  const now = Date.now();
  while (Date.now() - now < 1000) {
    client.send_object({ route: "/" }).then((e2) => world2.sendMessage(JSON.stringify(e2)));
    i++;
  }
  console.log("Sent a total of", i, "requests");
});
