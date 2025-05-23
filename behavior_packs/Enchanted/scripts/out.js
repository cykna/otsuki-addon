import { system, world } from '@minecraft/server';

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

const ROUTES_KEY = Symbol("ZethaRouting");
const ROUTE_BODY_TYPE_KEY = Symbol("ZethaBodyT");
function Route(path) {
    return function(target, property) {
        if (target[ROUTES_KEY] == null) target[ROUTES_KEY] = {};
        target[ROUTES_KEY][path] = target[property];
    };
}
(function(Helpers) {
    function BodyType(f) {
        return Reflect.getMetadata(ROUTE_BODY_TYPE_KEY, f);
    }
    Helpers.BodyType = BodyType;
})(Helpers || (Helpers = {}));
var Helpers;

var createNode = (part, inert) => {
  const inertMap = inert?.length ? {} : null;
  if (inertMap)
    for (const child of inert)
      inertMap[child.part.charCodeAt(0)] = child;
  return {
    part,
    store: null,
    inert: inertMap,
    params: null,
    wildcardStore: null
  };
};
var cloneNode = (node, part) => ({
  ...node,
  part
});
var createParamNode = (name) => ({
  name,
  store: null,
  inert: null
});
var Memoirist = class _Memoirist {
  constructor(config = {}) {
    this.config = config;
    if (config.lazy)
      this.find = this.lazyFind;
  }
  root = {};
  history = [];
  deferred = [];
  static regex = {
    static: /:.+?(?=\/|$)/,
    params: /:.+?(?=\/|$)/g,
    optionalParams: /:.+?\?(?=\/|$)/g
  };
  lazyFind = (method, url) => {
    if (!this.config.lazy)
      return this.find;
    this.build();
    return this.find(method, url);
  };
  build() {
    if (!this.config.lazy)
      return;
    for (const [method, path, store] of this.deferred)
      this.add(method, path, store, { lazy: false, ignoreHistory: true });
    this.deferred = [];
    this.find = (method, url) => {
      const root = this.root[method];
      if (!root)
        return null;
      return matchRoute(url, url.length, root, 0);
    };
  }
  add(method, path, store, {
    ignoreError = false,
    ignoreHistory = false,
    lazy = this.config.lazy
  } = {}) {
    if (lazy) {
      this.find = this.lazyFind;
      this.deferred.push([method, path, store]);
      return store;
    }
    if (typeof path !== "string")
      throw new TypeError("Route path must be a string");
    if (path === "")
      path = "/";
    else if (path[0] !== "/")
      path = `/${path}`;
    const isWildcard = path[path.length - 1] === "*";
    const optionalParams = path.match(_Memoirist.regex.optionalParams);
    if (optionalParams) {
      const originalPath = path.replaceAll("?", "");
      this.add(method, originalPath, store, {
        ignoreError,
        ignoreHistory,
        lazy
      });
      for (let i = 0; i < optionalParams.length; i++) {
        let newPath = path.replace("/" + optionalParams[i], "");
        this.add(method, newPath, store, {
          ignoreError: true,
          ignoreHistory,
          lazy
        });
      }
      return store;
    }
    if (optionalParams)
      path = path.replaceAll("?", "");
    if (this.history.find(([m, p, s]) => m === method && p === path))
      return store;
    if (isWildcard || optionalParams && path.charCodeAt(path.length - 1) === 63)
      path = path.slice(0, -1);
    if (!ignoreHistory)
      this.history.push([method, path, store]);
    const inertParts = path.split(_Memoirist.regex.static);
    const paramParts = path.match(_Memoirist.regex.params) || [];
    if (inertParts[inertParts.length - 1] === "")
      inertParts.pop();
    let node;
    if (!this.root[method])
      node = this.root[method] = createNode("/");
    else
      node = this.root[method];
    let paramPartsIndex = 0;
    for (let i = 0; i < inertParts.length; ++i) {
      let part = inertParts[i];
      if (i > 0) {
        const param = paramParts[paramPartsIndex++].slice(1);
        if (node.params === null)
          node.params = createParamNode(param);
        else if (node.params.name !== param) {
          if (ignoreError)
            return store;
          else
            throw new Error(
              `Cannot create route "${path}" with parameter "${param}" because a route already exists with a different parameter name ("${node.params.name}") in the same location`
            );
        }
        const params = node.params;
        if (params.inert === null) {
          node = params.inert = createNode(part);
          continue;
        }
        node = params.inert;
      }
      for (let j = 0; ; ) {
        if (j === part.length) {
          if (j < node.part.length) {
            const childNode = cloneNode(node, node.part.slice(j));
            Object.assign(node, createNode(part, [childNode]));
          }
          break;
        }
        if (j === node.part.length) {
          if (node.inert === null)
            node.inert = {};
          const inert = node.inert[part.charCodeAt(j)];
          if (inert) {
            node = inert;
            part = part.slice(j);
            j = 0;
            continue;
          }
          const childNode = createNode(part.slice(j));
          node.inert[part.charCodeAt(j)] = childNode;
          node = childNode;
          break;
        }
        if (part[j] !== node.part[j]) {
          const existingChild = cloneNode(node, node.part.slice(j));
          const newChild = createNode(part.slice(j));
          Object.assign(
            node,
            createNode(node.part.slice(0, j), [
              existingChild,
              newChild
            ])
          );
          node = newChild;
          break;
        }
        ++j;
      }
    }
    if (paramPartsIndex < paramParts.length) {
      const param = paramParts[paramPartsIndex];
      const name = param.slice(1);
      if (node.params === null)
        node.params = createParamNode(name);
      else if (node.params.name !== name) {
        if (ignoreError)
          return store;
        else
          throw new Error(
            `Cannot create route "${path}" with parameter "${name}" because a route already exists with a different parameter name ("${node.params.name}") in the same location`
          );
      }
      if (node.params.store === null)
        node.params.store = store;
      return node.params.store;
    }
    if (isWildcard) {
      if (node.wildcardStore === null)
        node.wildcardStore = store;
      return node.wildcardStore;
    }
    if (node.store === null)
      node.store = store;
    return node.store;
  }
  find(method, url) {
    const root = this.root[method];
    if (!root)
      return null;
    return matchRoute(url, url.length, root, 0);
  }
};
var matchRoute = (url, urlLength, node, startIndex) => {
  const part = node.part;
  const length = part.length;
  const endIndex = startIndex + length;
  if (length > 1) {
    if (endIndex > urlLength)
      return null;
    if (length < 15) {
      for (let i = 1, j = startIndex + 1; i < length; ++i, ++j)
        if (part.charCodeAt(i) !== url.charCodeAt(j))
          return null;
    } else if (url.slice(startIndex, endIndex) !== part)
      return null;
  }
  if (endIndex === urlLength) {
    if (node.store !== null)
      return {
        store: node.store,
        params: {}
      };
    if (node.wildcardStore !== null)
      return {
        store: node.wildcardStore,
        params: { "*": "" }
      };
    return null;
  }
  if (node.inert !== null) {
    const inert = node.inert[url.charCodeAt(endIndex)];
    if (inert !== void 0) {
      const route = matchRoute(url, urlLength, inert, endIndex);
      if (route !== null)
        return route;
    }
  }
  if (node.params !== null) {
    const { store, name, inert } = node.params;
    const slashIndex = url.indexOf("/", endIndex);
    if (slashIndex !== endIndex) {
      if (slashIndex === -1 || slashIndex >= urlLength) {
        if (store !== null) {
          const params = {};
          params[name] = url.substring(endIndex, urlLength);
          return {
            store,
            params
          };
        }
      } else if (inert !== null) {
        const route = matchRoute(url, urlLength, inert, slashIndex);
        if (route !== null) {
          route.params[name] = url.substring(endIndex, slashIndex);
          return route;
        }
      }
    }
  }
  if (node.wildcardStore !== null)
    return {
      store: node.wildcardStore,
      params: {
        "*": url.substring(endIndex, urlLength)
      }
    };
  return null;
};
var src_default = Memoirist;

(function(Response) {
    function Stringify(response) {
        return JSON.stringify(response);
    }
    Response.Stringify = Stringify;
    function ResponseFrom(raw) {
        try {
            const obj = JSON.parse(raw);
            if (obj.code == undefined || obj.body == undefined) throw 0;
            if (Object.keys(obj).length > 2) throw 0;
            return obj;
        } catch  {
            return {
                code: 3,
                body: JSON.stringify({
                    message: "Raw string failed while parsing to valid JSON"
                })
            };
        }
    }
    Response.ResponseFrom = ResponseFrom;
    function Success(body) {
        return {
            body: JSON.stringify(body),
            code: 0
        };
    }
    Response.Success = Success;
    function NotFound(body) {
        return {
            body: JSON.stringify(body),
            code: 1
        };
    }
    Response.NotFound = NotFound;
    function NotEnoughPermission(body) {
        return {
            body: JSON.stringify(body),
            code: 2
        };
    }
    Response.NotEnoughPermission = NotEnoughPermission;
    function InvalidCredentials(body) {
        return {
            body: JSON.stringify(body),
            code: 3
        };
    }
    Response.InvalidCredentials = InvalidCredentials;
    function InternalError(body) {
        return {
            body: JSON.stringify(body),
            code: 4
        };
    }
    Response.InternalError = InternalError;
})(Response || (Response = {}));
var Response;

function header(client, server, req) {
    return client + server + String.fromCharCode(req);
}
 class ClientInitializationMessage {
    static from(content) {
        return new ClientFinalizationMessage(content.slice(0, 2), content.slice(2, 4), content.charCodeAt(4));
    }
    constructor(client_id, server_id, request_index){
        this.client_id = client_id;
        this.server_id = server_id;
        this.request_index = request_index;
    }
 encode() {
        return this.client_id + this.server_id + String.fromCharCode(this.request_index);
    }
}
 class ClientPacketMessage {
    static from(content) {
        return new ClientPacketMessage(content.slice(0, 2), content.slice(2, 4), content.slice(5), content.charCodeAt(4));
    }
    constructor(client_id, server_id, content, request_index){
        this.client_id = client_id;
        this.server_id = server_id;
        this.content = content;
        this.request_index = request_index;
    }
 encode() {
        return `${header(this.client_id, this.server_id, this.request_index)}${this.content}`;
    }
}
 class ClientFinalizationMessage {
    static from(content) {
        return new ClientFinalizationMessage(content.slice(0, 2), content.slice(2, 4), content.charCodeAt(4));
    }
    constructor(client_id, server_id, request_index){
        this.client_id = client_id;
        this.server_id = server_id;
        this.request_index = request_index;
    }
    encode() {
        return this.client_id + this.server_id + String.fromCharCode(this.request_index);
    }
}
class ClientBatchMessage {
    static from(content) {
        const out = new ClientBatchMessage(content.slice(0, 2), content.slice(2, 4));
        const len = content.length;
        for(let i = 4; i < len;){
            const req_size = content.charCodeAt(i);
            const req_id = content.charCodeAt(i + 1);
            out.requests.push({
                body: content.slice(i + 2, i + 2 + req_size),
                id: req_id
            });
            i += req_size;
        }
        return out;
    }
    constructor(client_id, server_id){
        this.client_id = client_id;
        this.server_id = server_id;
        this.request_buffer = [];
        this.requests = [];
    }
 len() {
        return this.request_buffer.length;
    }
    add_request(req, id) {
        this.request_buffer.push(String.fromCharCode(req.length) + String.fromCharCode(id) + req);
    }
    encode() {
        return `${this.client_id}${this.server_id}${this.request_buffer}`;
    }
 clear() {
        this.request_buffer = [];
        this.requests.length = 0;
    }
}
class ClientSingleResquestMessage {
    static from(content) {
        const out = new ClientSingleResquestMessage(content.slice(0, 2), content.slice(2, 4), content.charCodeAt(4));
        out.content = content.slice(5);
        return out;
    }
    constructor(client_id, server_id, request_index){
        this.client_id = client_id;
        this.server_id = server_id;
        this.request_index = request_index;
        this.content = "";
    }
    encode() {
        return header(this.client_id, this.server_id, this.request_index) + this.content;
    }
}

var ResponseType =  function(ResponseType) {
    ResponseType["PacketData"] = "enchanted:response_data";
    ResponseType["BatchResponse"] = "enchantend:batch_response";
    ResponseType["SingleResponse"] = "enchanted:single_response";
    ResponseType["Finalization"] = "enchanted:response_end";
    return ResponseType;
}({});
var RequestType =  function(RequestType) {
    RequestType["Initialization"] = "enchanted:request";
    RequestType["PacketData"] = "enchanted:request_data";
    RequestType["BatchRequest"] = "enchanted:batch_request";
    RequestType["SingleRequest"] = "enchanted:single_request";
    RequestType["Finalization"] = "enchanted:finalize_request";
    return RequestType;
}({});

class ServerFinalizeMessage {
    static from(content) {
        return new ServerFinalizeMessage(content.slice(0, 2), content.charCodeAt(2));
    }
    constructor(target, response_index){
        this.target = target;
        this.response_index = response_index;
    }
    encode() {
        return `${this.target}${String.fromCharCode(this.response_index)}`;
    }
}
 class ServerPacketMessage {
    static from(content) {
        return new ServerPacketMessage(content.slice(0, 2), content.charCodeAt(2), content.slice(3));
    }
    constructor(target, response_index, content){
        this.target = target;
        this.response_index = response_index;
        this.content = content;
    }
    encode() {
        return `${this.target}${String.fromCharCode(this.response_index)}${this.content}`;
    }
}
class ServerBatchedMessage {
    static from(content) {
        const out = new ServerBatchedMessage(content.slice(0, 2));
        const len = content.length - 2;
        for(let i = 2; i < len;){
            const req_id = content.charCodeAt(i);
            const req_size = content.charCodeAt(i + 1);
            i += 2;
            out.response_buffer.push(String.fromCharCode(req_id) + String.fromCharCode(req_size) + content.slice(i, i + req_size + 1));
            out.responses.push({
                body: content.slice(i, i + req_size + 1),
                id: req_id
            });
            i += req_size + 1;
        }
        return out;
    }
    constructor(client_id){
        this.client_id = client_id;
        this.response_buffer = [];
        this.responses = [];
    }
    len() {
        return this.response_buffer.length;
    }
    add_response(res, id) {
        this.response_buffer.push(String.fromCharCode(id) + String.fromCharCode(res.length) + res);
    }
    encode() {
        return `${this.client_id}${this.response_buffer.join("")}`;
    }
 reset() {
        this.response_buffer.length = 0;
        this.responses.length = 0;
    }
}
class ServerSingleResponseMessage {
    static from(content) {
        return new ServerSingleResponseMessage(content.slice(0, 2), content.charCodeAt(2), content.slice(3));
    }
    constructor(client_id, request_index, content){
        this.client_id = client_id;
        this.request_index = request_index;
        this.content = content;
    }
    encode() {
        return `${this.client_id}${String.fromCharCode(this.request_index)}${this.content}`;
    }
}

var lzString = {exports: {}};

var hasRequiredLzString;
function requireLzString () {
	if (hasRequiredLzString) return lzString.exports;
	hasRequiredLzString = 1;
	(function (module) {
		var LZString = (function() {
		var f = String.fromCharCode;
		var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
		var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
		var baseReverseDic = {};
		function getBaseValue(alphabet, character) {
		  if (!baseReverseDic[alphabet]) {
		    baseReverseDic[alphabet] = {};
		    for (var i=0 ; i<alphabet.length ; i++) {
		      baseReverseDic[alphabet][alphabet.charAt(i)] = i;
		    }
		  }
		  return baseReverseDic[alphabet][character];
		}
		var LZString = {
		  compressToBase64 : function (input) {
		    if (input == null) return "";
		    var res = LZString._compress(input, 6, function(a){return keyStrBase64.charAt(a);});
		    switch (res.length % 4) {
		    default:
		    case 0 : return res;
		    case 1 : return res+"===";
		    case 2 : return res+"==";
		    case 3 : return res+"=";
		    }
		  },
		  decompressFromBase64 : function (input) {
		    if (input == null) return "";
		    if (input == "") return null;
		    return LZString._decompress(input.length, 32, function(index) { return getBaseValue(keyStrBase64, input.charAt(index)); });
		  },
		  compressToUTF16 : function (input) {
		    if (input == null) return "";
		    return LZString._compress(input, 15, function(a){return f(a+32);}) + " ";
		  },
		  decompressFromUTF16: function (compressed) {
		    if (compressed == null) return "";
		    if (compressed == "") return null;
		    return LZString._decompress(compressed.length, 16384, function(index) { return compressed.charCodeAt(index) - 32; });
		  },
		  compressToUint8Array: function (uncompressed) {
		    var compressed = LZString.compress(uncompressed);
		    var buf=new Uint8Array(compressed.length*2);
		    for (var i=0, TotalLen=compressed.length; i<TotalLen; i++) {
		      var current_value = compressed.charCodeAt(i);
		      buf[i*2] = current_value >>> 8;
		      buf[i*2+1] = current_value % 256;
		    }
		    return buf;
		  },
		  decompressFromUint8Array:function (compressed) {
		    if (compressed===null || compressed===undefined){
		        return LZString.decompress(compressed);
		    } else {
		        var buf=new Array(compressed.length/2);
		        for (var i=0, TotalLen=buf.length; i<TotalLen; i++) {
		          buf[i]=compressed[i*2]*256+compressed[i*2+1];
		        }
		        var result = [];
		        buf.forEach(function (c) {
		          result.push(f(c));
		        });
		        return LZString.decompress(result.join(''));
		    }
		  },
		  compressToEncodedURIComponent: function (input) {
		    if (input == null) return "";
		    return LZString._compress(input, 6, function(a){return keyStrUriSafe.charAt(a);});
		  },
		  decompressFromEncodedURIComponent:function (input) {
		    if (input == null) return "";
		    if (input == "") return null;
		    input = input.replace(/ /g, "+");
		    return LZString._decompress(input.length, 32, function(index) { return getBaseValue(keyStrUriSafe, input.charAt(index)); });
		  },
		  compress: function (uncompressed) {
		    return LZString._compress(uncompressed, 16, function(a){return f(a);});
		  },
		  _compress: function (uncompressed, bitsPerChar, getCharFromInt) {
		    if (uncompressed == null) return "";
		    var i, value,
		        context_dictionary= {},
		        context_dictionaryToCreate= {},
		        context_c="",
		        context_wc="",
		        context_w="",
		        context_enlargeIn= 2,
		        context_dictSize= 3,
		        context_numBits= 2,
		        context_data=[],
		        context_data_val=0,
		        context_data_position=0,
		        ii;
		    for (ii = 0; ii < uncompressed.length; ii += 1) {
		      context_c = uncompressed.charAt(ii);
		      if (!Object.prototype.hasOwnProperty.call(context_dictionary,context_c)) {
		        context_dictionary[context_c] = context_dictSize++;
		        context_dictionaryToCreate[context_c] = true;
		      }
		      context_wc = context_w + context_c;
		      if (Object.prototype.hasOwnProperty.call(context_dictionary,context_wc)) {
		        context_w = context_wc;
		      } else {
		        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
		          if (context_w.charCodeAt(0)<256) {
		            for (i=0 ; i<context_numBits ; i++) {
		              context_data_val = (context_data_val << 1);
		              if (context_data_position == bitsPerChar-1) {
		                context_data_position = 0;
		                context_data.push(getCharFromInt(context_data_val));
		                context_data_val = 0;
		              } else {
		                context_data_position++;
		              }
		            }
		            value = context_w.charCodeAt(0);
		            for (i=0 ; i<8 ; i++) {
		              context_data_val = (context_data_val << 1) | (value&1);
		              if (context_data_position == bitsPerChar-1) {
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
		            for (i=0 ; i<context_numBits ; i++) {
		              context_data_val = (context_data_val << 1) | value;
		              if (context_data_position ==bitsPerChar-1) {
		                context_data_position = 0;
		                context_data.push(getCharFromInt(context_data_val));
		                context_data_val = 0;
		              } else {
		                context_data_position++;
		              }
		              value = 0;
		            }
		            value = context_w.charCodeAt(0);
		            for (i=0 ; i<16 ; i++) {
		              context_data_val = (context_data_val << 1) | (value&1);
		              if (context_data_position == bitsPerChar-1) {
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
		          for (i=0 ; i<context_numBits ; i++) {
		            context_data_val = (context_data_val << 1) | (value&1);
		            if (context_data_position == bitsPerChar-1) {
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
		      if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
		        if (context_w.charCodeAt(0)<256) {
		          for (i=0 ; i<context_numBits ; i++) {
		            context_data_val = (context_data_val << 1);
		            if (context_data_position == bitsPerChar-1) {
		              context_data_position = 0;
		              context_data.push(getCharFromInt(context_data_val));
		              context_data_val = 0;
		            } else {
		              context_data_position++;
		            }
		          }
		          value = context_w.charCodeAt(0);
		          for (i=0 ; i<8 ; i++) {
		            context_data_val = (context_data_val << 1) | (value&1);
		            if (context_data_position == bitsPerChar-1) {
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
		          for (i=0 ; i<context_numBits ; i++) {
		            context_data_val = (context_data_val << 1) | value;
		            if (context_data_position == bitsPerChar-1) {
		              context_data_position = 0;
		              context_data.push(getCharFromInt(context_data_val));
		              context_data_val = 0;
		            } else {
		              context_data_position++;
		            }
		            value = 0;
		          }
		          value = context_w.charCodeAt(0);
		          for (i=0 ; i<16 ; i++) {
		            context_data_val = (context_data_val << 1) | (value&1);
		            if (context_data_position == bitsPerChar-1) {
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
		        for (i=0 ; i<context_numBits ; i++) {
		          context_data_val = (context_data_val << 1) | (value&1);
		          if (context_data_position == bitsPerChar-1) {
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
		    for (i=0 ; i<context_numBits ; i++) {
		      context_data_val = (context_data_val << 1) | (value&1);
		      if (context_data_position == bitsPerChar-1) {
		        context_data_position = 0;
		        context_data.push(getCharFromInt(context_data_val));
		        context_data_val = 0;
		      } else {
		        context_data_position++;
		      }
		      value = value >> 1;
		    }
		    while (true) {
		      context_data_val = (context_data_val << 1);
		      if (context_data_position == bitsPerChar-1) {
		        context_data.push(getCharFromInt(context_data_val));
		        break;
		      }
		      else context_data_position++;
		    }
		    return context_data.join('');
		  },
		  decompress: function (compressed) {
		    if (compressed == null) return "";
		    if (compressed == "") return null;
		    return LZString._decompress(compressed.length, 32768, function(index) { return compressed.charCodeAt(index); });
		  },
		  _decompress: function (length, resetValue, getNextValue) {
		    var dictionary = [],
		        enlargeIn = 4,
		        dictSize = 4,
		        numBits = 3,
		        entry = "",
		        result = [],
		        i,
		        w,
		        bits, resb, maxpower, power,
		        c,
		        data = {val:getNextValue(0), position:resetValue, index:1};
		    for (i = 0; i < 3; i += 1) {
		      dictionary[i] = i;
		    }
		    bits = 0;
		    maxpower = Math.pow(2,2);
		    power=1;
		    while (power!=maxpower) {
		      resb = data.val & data.position;
		      data.position >>= 1;
		      if (data.position == 0) {
		        data.position = resetValue;
		        data.val = getNextValue(data.index++);
		      }
		      bits |= (resb>0 ? 1 : 0) * power;
		      power <<= 1;
		    }
		    switch (bits) {
		      case 0:
		          bits = 0;
		          maxpower = Math.pow(2,8);
		          power=1;
		          while (power!=maxpower) {
		            resb = data.val & data.position;
		            data.position >>= 1;
		            if (data.position == 0) {
		              data.position = resetValue;
		              data.val = getNextValue(data.index++);
		            }
		            bits |= (resb>0 ? 1 : 0) * power;
		            power <<= 1;
		          }
		        c = f(bits);
		        break;
		      case 1:
		          bits = 0;
		          maxpower = Math.pow(2,16);
		          power=1;
		          while (power!=maxpower) {
		            resb = data.val & data.position;
		            data.position >>= 1;
		            if (data.position == 0) {
		              data.position = resetValue;
		              data.val = getNextValue(data.index++);
		            }
		            bits |= (resb>0 ? 1 : 0) * power;
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
		      maxpower = Math.pow(2,numBits);
		      power=1;
		      while (power!=maxpower) {
		        resb = data.val & data.position;
		        data.position >>= 1;
		        if (data.position == 0) {
		          data.position = resetValue;
		          data.val = getNextValue(data.index++);
		        }
		        bits |= (resb>0 ? 1 : 0) * power;
		        power <<= 1;
		      }
		      switch (c = bits) {
		        case 0:
		          bits = 0;
		          maxpower = Math.pow(2,8);
		          power=1;
		          while (power!=maxpower) {
		            resb = data.val & data.position;
		            data.position >>= 1;
		            if (data.position == 0) {
		              data.position = resetValue;
		              data.val = getNextValue(data.index++);
		            }
		            bits |= (resb>0 ? 1 : 0) * power;
		            power <<= 1;
		          }
		          dictionary[dictSize++] = f(bits);
		          c = dictSize-1;
		          enlargeIn--;
		          break;
		        case 1:
		          bits = 0;
		          maxpower = Math.pow(2,16);
		          power=1;
		          while (power!=maxpower) {
		            resb = data.val & data.position;
		            data.position >>= 1;
		            if (data.position == 0) {
		              data.position = resetValue;
		              data.val = getNextValue(data.index++);
		            }
		            bits |= (resb>0 ? 1 : 0) * power;
		            power <<= 1;
		          }
		          dictionary[dictSize++] = f(bits);
		          c = dictSize-1;
		          enlargeIn--;
		          break;
		        case 2:
		          return result.join('');
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
		  return LZString;
		})();
		if( module != null ) {
		  module.exports = LZString;
		} else if( typeof angular !== 'undefined' && angular != null ) {
		  angular.module('LZString', [])
		  .factory('LZString', function () {
		    return LZString;
		  });
		}
	} (lzString));
	return lzString.exports;
}

var lzStringExports = /*@__PURE__*/ requireLzString();
const lz = /*@__PURE__*/getDefaultExportFromCjs(lzStringExports);

function* send_packet(buffer, target, id) {
    const message = new ServerPacketMessage(target, id, '');
    for(let i = 0, j = buffer.length; i < j; i += 2048){
        message.content = buffer.substring(i, i + 2048);
        yield system.sendScriptEvent(ResponseType.PacketData, message.encode());
    }
}
 function* send_response(response, target, id) {
    yield* send_packet(response, target, id);
    system.sendScriptEvent(ResponseType.Finalization, new ServerFinalizeMessage(target, id).encode());
}
 function send_packet_blocking(buffer, target, id) {
    const message = new ServerPacketMessage(target, id, '');
    for(let i = 0, j = buffer.length; i < j; i += 2048){
        message.content = buffer.substring(i, i + 2048);
        system.sendScriptEvent(ResponseType.PacketData, message.encode());
    }
}
 function send_response_blocking(response, target, id) {
    send_packet_blocking(response, target, id);
    system.sendScriptEvent(ResponseType.Finalization, new ServerFinalizeMessage(target, id).encode());
}
function send_batch(message) {
    const content = lz.compress(message.encode());
    system.sendScriptEvent(ResponseType.BatchResponse, content);
}
 function send_single(message) {
    system.sendScriptEvent(ResponseType.SingleResponse, message.encode());
}

let decoder;
try {
	decoder = new TextDecoder();
} catch(error) {}
let src;
let srcEnd;
let position$1 = 0;
const LEGACY_RECORD_INLINE_ID = 105;
const RECORD_DEFINITIONS_ID = 0xdffe;
const RECORD_INLINE_ID = 0xdfff;
const BUNDLED_STRINGS_ID = 0xdff9;
const PACKED_REFERENCE_TAG_ID = 6;
const STOP_CODE = {};
let maxArraySize = 112810000;
let maxMapSize = 16810000;
let currentDecoder = {};
let currentStructures;
let srcString;
let srcStringStart = 0;
let srcStringEnd = 0;
let bundledStrings$1;
let referenceMap;
let currentExtensions = [];
let currentExtensionRanges = [];
let packedValues;
let dataView;
let restoreMapsAsObject;
let defaultOptions = {
	useRecords: false,
	mapsAsObjects: true
};
let sequentialMode = false;
let inlineObjectReadThreshold = 2;
try {
	new Function('');
} catch(error) {
	inlineObjectReadThreshold = Infinity;
}
class Decoder {
	constructor(options) {
		if (options) {
			if ((options.keyMap || options._keyMap) && !options.useRecords) {
				options.useRecords = false;
				options.mapsAsObjects = true;
			}
			if (options.useRecords === false && options.mapsAsObjects === undefined)
				options.mapsAsObjects = true;
			if (options.getStructures)
				options.getShared = options.getStructures;
			if (options.getShared && !options.structures)
				(options.structures = []).uninitialized = true;
			if (options.keyMap) {
				this.mapKey = new Map();
				for (let [k,v] of Object.entries(options.keyMap)) this.mapKey.set(v,k);
			}
		}
		Object.assign(this, options);
	}
	decodeKey(key) {
		return this.keyMap ? this.mapKey.get(key) || key : key
	}
	encodeKey(key) {
		return this.keyMap && this.keyMap.hasOwnProperty(key) ? this.keyMap[key] : key
	}
	encodeKeys(rec) {
		if (!this._keyMap) return rec
		let map = new Map();
		for (let [k,v] of Object.entries(rec)) map.set((this._keyMap.hasOwnProperty(k) ? this._keyMap[k] : k), v);
		return map
	}
	decodeKeys(map) {
		if (!this._keyMap || map.constructor.name != 'Map') return map
		if (!this._mapKey) {
			this._mapKey = new Map();
			for (let [k,v] of Object.entries(this._keyMap)) this._mapKey.set(v,k);
		}
		let res = {};
		map.forEach((v,k) => res[safeKey(this._mapKey.has(k) ? this._mapKey.get(k) : k)] =  v);
		return res
	}
	mapDecode(source, end) {
		let res = this.decode(source);
		if (this._keyMap) {
			switch (res.constructor.name) {
				case 'Array': return res.map(r => this.decodeKeys(r))
			}
		}
		return res
	}
	decode(source, end) {
		if (src) {
			return saveState(() => {
				clearSource();
				return this ? this.decode(source, end) : Decoder.prototype.decode.call(defaultOptions, source, end)
			})
		}
		srcEnd = end > -1 ? end : source.length;
		position$1 = 0;
		srcStringEnd = 0;
		srcString = null;
		bundledStrings$1 = null;
		src = source;
		try {
			dataView = source.dataView || (source.dataView = new DataView(source.buffer, source.byteOffset, source.byteLength));
		} catch(error) {
			src = null;
			if (source instanceof Uint8Array)
				throw error
			throw new Error('Source must be a Uint8Array or Buffer but was a ' + ((source && typeof source == 'object') ? source.constructor.name : typeof source))
		}
		if (this instanceof Decoder) {
			currentDecoder = this;
			packedValues = this.sharedValues &&
				(this.pack ? new Array(this.maxPrivatePackedValues || 16).concat(this.sharedValues) :
				this.sharedValues);
			if (this.structures) {
				currentStructures = this.structures;
				return checkedRead()
			} else if (!currentStructures || currentStructures.length > 0) {
				currentStructures = [];
			}
		} else {
			currentDecoder = defaultOptions;
			if (!currentStructures || currentStructures.length > 0)
				currentStructures = [];
			packedValues = null;
		}
		return checkedRead()
	}
	decodeMultiple(source, forEach) {
		let values, lastPosition = 0;
		try {
			let size = source.length;
			sequentialMode = true;
			let value = this ? this.decode(source, size) : defaultDecoder.decode(source, size);
			if (forEach) {
				if (forEach(value) === false) {
					return
				}
				while(position$1 < size) {
					lastPosition = position$1;
					if (forEach(checkedRead()) === false) {
						return
					}
				}
			}
			else {
				values = [ value ];
				while(position$1 < size) {
					lastPosition = position$1;
					values.push(checkedRead());
				}
				return values
			}
		} catch(error) {
			error.lastPosition = lastPosition;
			error.values = values;
			throw error
		} finally {
			sequentialMode = false;
			clearSource();
		}
	}
}
function checkedRead() {
	try {
		let result = read();
		if (bundledStrings$1) {
			if (position$1 >= bundledStrings$1.postBundlePosition) {
				let error = new Error('Unexpected bundle position');
				error.incomplete = true;
				throw error
			}
			position$1 = bundledStrings$1.postBundlePosition;
			bundledStrings$1 = null;
		}
		if (position$1 == srcEnd) {
			currentStructures = null;
			src = null;
			if (referenceMap)
				referenceMap = null;
		} else if (position$1 > srcEnd) {
			let error = new Error('Unexpected end of CBOR data');
			error.incomplete = true;
			throw error
		} else if (!sequentialMode) {
			throw new Error('Data read, but end of buffer not reached')
		}
		return result
	} catch(error) {
		clearSource();
		if (error instanceof RangeError || error.message.startsWith('Unexpected end of buffer')) {
			error.incomplete = true;
		}
		throw error
	}
}
function read() {
	let token = src[position$1++];
	let majorType = token >> 5;
	token = token & 0x1f;
	if (token > 0x17) {
		switch (token) {
			case 0x18:
				token = src[position$1++];
				break
			case 0x19:
				if (majorType == 7) {
					return getFloat16()
				}
				token = dataView.getUint16(position$1);
				position$1 += 2;
				break
			case 0x1a:
				if (majorType == 7) {
					let value = dataView.getFloat32(position$1);
					if (currentDecoder.useFloat32 > 2) {
						let multiplier = mult10[((src[position$1] & 0x7f) << 1) | (src[position$1 + 1] >> 7)];
						position$1 += 4;
						return ((multiplier * value + (value > 0 ? 0.5 : -0.5)) >> 0) / multiplier
					}
					position$1 += 4;
					return value
				}
				token = dataView.getUint32(position$1);
				position$1 += 4;
				break
			case 0x1b:
				if (majorType == 7) {
					let value = dataView.getFloat64(position$1);
					position$1 += 8;
					return value
				}
				if (majorType > 1) {
					if (dataView.getUint32(position$1) > 0)
						throw new Error('JavaScript does not support arrays, maps, or strings with length over 4294967295')
					token = dataView.getUint32(position$1 + 4);
				} else if (currentDecoder.int64AsNumber) {
					token = dataView.getUint32(position$1) * 0x100000000;
					token += dataView.getUint32(position$1 + 4);
				} else
					token = dataView.getBigUint64(position$1);
				position$1 += 8;
				break
			case 0x1f:
				switch(majorType) {
					case 2:
					case 3:
						throw new Error('Indefinite length not supported for byte or text strings')
					case 4:
						let array = [];
						let value, i = 0;
						while ((value = read()) != STOP_CODE) {
							if (i >= maxArraySize) throw new Error(`Array length exceeds ${maxArraySize}`)
							array[i++] = value;
						}
						return majorType == 4 ? array : majorType == 3 ? array.join('') : Buffer.concat(array)
					case 5:
						let key;
						if (currentDecoder.mapsAsObjects) {
							let object = {};
							let i = 0;
							if (currentDecoder.keyMap) {
								while((key = read()) != STOP_CODE) {
									if (i++ >= maxMapSize) throw new Error(`Property count exceeds ${maxMapSize}`)
									object[safeKey(currentDecoder.decodeKey(key))] = read();
								}
							}
							else {
								while ((key = read()) != STOP_CODE) {
									if (i++ >= maxMapSize) throw new Error(`Property count exceeds ${maxMapSize}`)
									object[safeKey(key)] = read();
								}
							}
							return object
						} else {
							if (restoreMapsAsObject) {
								currentDecoder.mapsAsObjects = true;
								restoreMapsAsObject = false;
							}
							let map = new Map();
							if (currentDecoder.keyMap) {
								let i = 0;
								while((key = read()) != STOP_CODE) {
									if (i++ >= maxMapSize) {
										throw new Error(`Map size exceeds ${maxMapSize}`);
									}
									map.set(currentDecoder.decodeKey(key), read());
								}
							}
							else {
								let i = 0;
								while ((key = read()) != STOP_CODE) {
									if (i++ >= maxMapSize) {
										throw new Error(`Map size exceeds ${maxMapSize}`);
									}
									map.set(key, read());
								}
							}
							return map
						}
					case 7:
						return STOP_CODE
					default:
						throw new Error('Invalid major type for indefinite length ' + majorType)
				}
			default:
				throw new Error('Unknown token ' + token)
		}
	}
	switch (majorType) {
		case 0:
			return token
		case 1:
			return ~token
		case 2:
			return readBin(token)
		case 3:
			if (srcStringEnd >= position$1) {
				return srcString.slice(position$1 - srcStringStart, (position$1 += token) - srcStringStart)
			}
			if (srcStringEnd == 0 && srcEnd < 140 && token < 32) {
				let string = token < 16 ? shortStringInJS(token) : longStringInJS(token);
				if (string != null)
					return string
			}
			return readFixedString(token)
		case 4:
			if (token >= maxArraySize) throw new Error(`Array length exceeds ${maxArraySize}`)
			let array = new Array(token);
			for (let i = 0; i < token; i++) array[i] = read();
			return array
		case 5:
			if (token >= maxMapSize) throw new Error(`Map size exceeds ${maxArraySize}`)
			if (currentDecoder.mapsAsObjects) {
				let object = {};
				if (currentDecoder.keyMap) for (let i = 0; i < token; i++) object[safeKey(currentDecoder.decodeKey(read()))] = read();
				else for (let i = 0; i < token; i++) object[safeKey(read())] = read();
				return object
			} else {
				if (restoreMapsAsObject) {
					currentDecoder.mapsAsObjects = true;
					restoreMapsAsObject = false;
				}
				let map = new Map();
				if (currentDecoder.keyMap) for (let i = 0; i < token; i++) map.set(currentDecoder.decodeKey(read()),read());
				else for (let i = 0; i < token; i++) map.set(read(), read());
				return map
			}
		case 6:
			if (token >= BUNDLED_STRINGS_ID) {
				let structure = currentStructures[token & 0x1fff];
				if (structure) {
					if (!structure.read) structure.read = createStructureReader(structure);
					return structure.read()
				}
				if (token < 0x10000) {
					if (token == RECORD_INLINE_ID) {
						let length = readJustLength();
						let id = read();
						let structure = read();
						recordDefinition(id, structure);
						let object = {};
						if (currentDecoder.keyMap) for (let i = 2; i < length; i++) {
							let key = currentDecoder.decodeKey(structure[i - 2]);
							object[safeKey(key)] = read();
						}
						else for (let i = 2; i < length; i++) {
							let key = structure[i - 2];
							object[safeKey(key)] = read();
						}
						return object
					}
					else if (token == RECORD_DEFINITIONS_ID) {
						let length = readJustLength();
						let id = read();
						for (let i = 2; i < length; i++) {
							recordDefinition(id++, read());
						}
						return read()
					} else if (token == BUNDLED_STRINGS_ID) {
						return readBundleExt()
					}
					if (currentDecoder.getShared) {
						loadShared();
						structure = currentStructures[token & 0x1fff];
						if (structure) {
							if (!structure.read)
								structure.read = createStructureReader(structure);
							return structure.read()
						}
					}
				}
			}
			let extension = currentExtensions[token];
			if (extension) {
				if (extension.handlesRead)
					return extension(read)
				else
					return extension(read())
			} else {
				let input = read();
				for (let i = 0; i < currentExtensionRanges.length; i++) {
					let value = currentExtensionRanges[i](token, input);
					if (value !== undefined)
						return value
				}
				return new Tag(input, token)
			}
		case 7:
			switch (token) {
				case 0x14: return false
				case 0x15: return true
				case 0x16: return null
				case 0x17: return;
				case 0x1f:
				default:
					let packedValue = (packedValues || getPackedValues())[token];
					if (packedValue !== undefined)
						return packedValue
					throw new Error('Unknown token ' + token)
			}
		default:
			if (isNaN(token)) {
				let error = new Error('Unexpected end of CBOR data');
				error.incomplete = true;
				throw error
			}
			throw new Error('Unknown CBOR token ' + token)
	}
}
const validName = /^[a-zA-Z_$][a-zA-Z\d_$]*$/;
function createStructureReader(structure) {
	if (!structure) throw new Error('Structure is required in record definition');
	function readObject() {
		let length = src[position$1++];
		length = length & 0x1f;
		if (length > 0x17) {
			switch (length) {
				case 0x18:
					length = src[position$1++];
					break
				case 0x19:
					length = dataView.getUint16(position$1);
					position$1 += 2;
					break
				case 0x1a:
					length = dataView.getUint32(position$1);
					position$1 += 4;
					break
				default:
					throw new Error('Expected array header, but got ' + src[position$1 - 1])
			}
		}
		let compiledReader = this.compiledReader;
		while(compiledReader) {
			if (compiledReader.propertyCount === length)
				return compiledReader(read)
			compiledReader = compiledReader.next;
		}
		if (this.slowReads++ >= inlineObjectReadThreshold) {
			let array = this.length == length ? this : this.slice(0, length);
			compiledReader = currentDecoder.keyMap
			? new Function('r', 'return {' + array.map(k => currentDecoder.decodeKey(k)).map(k => validName.test(k) ? safeKey(k) + ':r()' : ('[' + JSON.stringify(k) + ']:r()')).join(',') + '}')
			: new Function('r', 'return {' + array.map(key => validName.test(key) ? safeKey(key) + ':r()' : ('[' + JSON.stringify(key) + ']:r()')).join(',') + '}');
			if (this.compiledReader)
				compiledReader.next = this.compiledReader;
			compiledReader.propertyCount = length;
			this.compiledReader = compiledReader;
			return compiledReader(read)
		}
		let object = {};
		if (currentDecoder.keyMap) for (let i = 0; i < length; i++) object[safeKey(currentDecoder.decodeKey(this[i]))] = read();
		else for (let i = 0; i < length; i++) {
			object[safeKey(this[i])] = read();
		}
		return object
	}
	structure.slowReads = 0;
	return readObject
}
function safeKey(key) {
	if (typeof key === 'string') return key === '__proto__' ? '__proto_' : key
	if (typeof key === 'number' || typeof key === 'boolean' || typeof key === 'bigint') return key.toString();
	if (key == null) return key + '';
	throw new Error('Invalid property name type ' + typeof key);
}
let readFixedString = readStringJS;
function readStringJS(length) {
	let result;
	if (length < 16) {
		if (result = shortStringInJS(length))
			return result
	}
	if (length > 64 && decoder)
		return decoder.decode(src.subarray(position$1, position$1 += length))
	const end = position$1 + length;
	const units = [];
	result = '';
	while (position$1 < end) {
		const byte1 = src[position$1++];
		if ((byte1 & 0x80) === 0) {
			units.push(byte1);
		} else if ((byte1 & 0xe0) === 0xc0) {
			const byte2 = src[position$1++] & 0x3f;
			units.push(((byte1 & 0x1f) << 6) | byte2);
		} else if ((byte1 & 0xf0) === 0xe0) {
			const byte2 = src[position$1++] & 0x3f;
			const byte3 = src[position$1++] & 0x3f;
			units.push(((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3);
		} else if ((byte1 & 0xf8) === 0xf0) {
			const byte2 = src[position$1++] & 0x3f;
			const byte3 = src[position$1++] & 0x3f;
			const byte4 = src[position$1++] & 0x3f;
			let unit = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4;
			if (unit > 0xffff) {
				unit -= 0x10000;
				units.push(((unit >>> 10) & 0x3ff) | 0xd800);
				unit = 0xdc00 | (unit & 0x3ff);
			}
			units.push(unit);
		} else {
			units.push(byte1);
		}
		if (units.length >= 0x1000) {
			result += fromCharCode.apply(String, units);
			units.length = 0;
		}
	}
	if (units.length > 0) {
		result += fromCharCode.apply(String, units);
	}
	return result
}
let fromCharCode = String.fromCharCode;
function longStringInJS(length) {
	let start = position$1;
	let bytes = new Array(length);
	for (let i = 0; i < length; i++) {
		const byte = src[position$1++];
		if ((byte & 0x80) > 0) {
			position$1 = start;
    			return
    		}
    		bytes[i] = byte;
    	}
    	return fromCharCode.apply(String, bytes)
}
function shortStringInJS(length) {
	if (length < 4) {
		if (length < 2) {
			if (length === 0)
				return ''
			else {
				let a = src[position$1++];
				if ((a & 0x80) > 1) {
					position$1 -= 1;
					return
				}
				return fromCharCode(a)
			}
		} else {
			let a = src[position$1++];
			let b = src[position$1++];
			if ((a & 0x80) > 0 || (b & 0x80) > 0) {
				position$1 -= 2;
				return
			}
			if (length < 3)
				return fromCharCode(a, b)
			let c = src[position$1++];
			if ((c & 0x80) > 0) {
				position$1 -= 3;
				return
			}
			return fromCharCode(a, b, c)
		}
	} else {
		let a = src[position$1++];
		let b = src[position$1++];
		let c = src[position$1++];
		let d = src[position$1++];
		if ((a & 0x80) > 0 || (b & 0x80) > 0 || (c & 0x80) > 0 || (d & 0x80) > 0) {
			position$1 -= 4;
			return
		}
		if (length < 6) {
			if (length === 4)
				return fromCharCode(a, b, c, d)
			else {
				let e = src[position$1++];
				if ((e & 0x80) > 0) {
					position$1 -= 5;
					return
				}
				return fromCharCode(a, b, c, d, e)
			}
		} else if (length < 8) {
			let e = src[position$1++];
			let f = src[position$1++];
			if ((e & 0x80) > 0 || (f & 0x80) > 0) {
				position$1 -= 6;
				return
			}
			if (length < 7)
				return fromCharCode(a, b, c, d, e, f)
			let g = src[position$1++];
			if ((g & 0x80) > 0) {
				position$1 -= 7;
				return
			}
			return fromCharCode(a, b, c, d, e, f, g)
		} else {
			let e = src[position$1++];
			let f = src[position$1++];
			let g = src[position$1++];
			let h = src[position$1++];
			if ((e & 0x80) > 0 || (f & 0x80) > 0 || (g & 0x80) > 0 || (h & 0x80) > 0) {
				position$1 -= 8;
				return
			}
			if (length < 10) {
				if (length === 8)
					return fromCharCode(a, b, c, d, e, f, g, h)
				else {
					let i = src[position$1++];
					if ((i & 0x80) > 0) {
						position$1 -= 9;
						return
					}
					return fromCharCode(a, b, c, d, e, f, g, h, i)
				}
			} else if (length < 12) {
				let i = src[position$1++];
				let j = src[position$1++];
				if ((i & 0x80) > 0 || (j & 0x80) > 0) {
					position$1 -= 10;
					return
				}
				if (length < 11)
					return fromCharCode(a, b, c, d, e, f, g, h, i, j)
				let k = src[position$1++];
				if ((k & 0x80) > 0) {
					position$1 -= 11;
					return
				}
				return fromCharCode(a, b, c, d, e, f, g, h, i, j, k)
			} else {
				let i = src[position$1++];
				let j = src[position$1++];
				let k = src[position$1++];
				let l = src[position$1++];
				if ((i & 0x80) > 0 || (j & 0x80) > 0 || (k & 0x80) > 0 || (l & 0x80) > 0) {
					position$1 -= 12;
					return
				}
				if (length < 14) {
					if (length === 12)
						return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l)
					else {
						let m = src[position$1++];
						if ((m & 0x80) > 0) {
							position$1 -= 13;
							return
						}
						return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m)
					}
				} else {
					let m = src[position$1++];
					let n = src[position$1++];
					if ((m & 0x80) > 0 || (n & 0x80) > 0) {
						position$1 -= 14;
						return
					}
					if (length < 15)
						return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m, n)
					let o = src[position$1++];
					if ((o & 0x80) > 0) {
						position$1 -= 15;
						return
					}
					return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o)
				}
			}
		}
	}
}
function readBin(length) {
	return currentDecoder.copyBuffers ?
		Uint8Array.prototype.slice.call(src, position$1, position$1 += length) :
		src.subarray(position$1, position$1 += length)
}
let f32Array = new Float32Array(1);
let u8Array = new Uint8Array(f32Array.buffer, 0, 4);
function getFloat16() {
	let byte0 = src[position$1++];
	let byte1 = src[position$1++];
	let exponent = (byte0 & 0x7f) >> 2;
	if (exponent === 0x1f) {
		if (byte1 || (byte0 & 3))
			return NaN;
		return (byte0 & 0x80) ? -Infinity : Infinity;
	}
	if (exponent === 0) {
		let abs = (((byte0 & 3) << 8) | byte1) / (1 << 24);
		return (byte0 & 0x80) ? -abs : abs
	}
	u8Array[3] = (byte0 & 0x80) |
		((exponent >> 1) + 56);
	u8Array[2] = ((byte0 & 7) << 5) |
		(byte1 >> 3);
	u8Array[1] = byte1 << 5;
	u8Array[0] = 0;
	return f32Array[0];
}
new Array(4096);
class Tag {
	constructor(value, tag) {
		this.value = value;
		this.tag = tag;
	}
}
currentExtensions[0] = (dateString) => {
	return new Date(dateString)
};
currentExtensions[1] = (epochSec) => {
	return new Date(Math.round(epochSec * 1000))
};
currentExtensions[2] = (buffer) => {
	let value = BigInt(0);
	for (let i = 0, l = buffer.byteLength; i < l; i++) {
		value = BigInt(buffer[i]) + (value << BigInt(8));
	}
	return value
};
currentExtensions[3] = (buffer) => {
	return BigInt(-1) - currentExtensions[2](buffer)
};
currentExtensions[4] = (fraction) => {
	return +(fraction[1] + 'e' + fraction[0])
};
currentExtensions[5] = (fraction) => {
	return fraction[1] * Math.exp(fraction[0] * Math.log(2))
};
const recordDefinition = (id, structure) => {
	id = id - 0xe000;
	let existingStructure = currentStructures[id];
	if (existingStructure && existingStructure.isShared) {
		(currentStructures.restoreStructures || (currentStructures.restoreStructures = []))[id] = existingStructure;
	}
	currentStructures[id] = structure;
	structure.read = createStructureReader(structure);
};
currentExtensions[LEGACY_RECORD_INLINE_ID] = (data) => {
	let length = data.length;
	let structure = data[1];
	recordDefinition(data[0], structure);
	let object = {};
	for (let i = 2; i < length; i++) {
		let key = structure[i - 2];
		object[safeKey(key)] = data[i];
	}
	return object
};
currentExtensions[14] = (value) => {
	if (bundledStrings$1)
		return bundledStrings$1[0].slice(bundledStrings$1.position0, bundledStrings$1.position0 += value)
	return new Tag(value, 14)
};
currentExtensions[15] = (value) => {
	if (bundledStrings$1)
		return bundledStrings$1[1].slice(bundledStrings$1.position1, bundledStrings$1.position1 += value)
	return new Tag(value, 15)
};
let glbl = { Error, RegExp };
currentExtensions[27] = (data) => {
	return (glbl[data[0]] || Error)(data[1], data[2])
};
const packedTable = (read) => {
	if (src[position$1++] != 0x84) {
		let error = new Error('Packed values structure must be followed by a 4 element array');
		if (src.length < position$1)
			error.incomplete = true;
		throw error
	}
	let newPackedValues = read();
	if (!newPackedValues || !newPackedValues.length) {
		let error = new Error('Packed values structure must be followed by a 4 element array');
		error.incomplete = true;
		throw error
	}
	packedValues = packedValues ? newPackedValues.concat(packedValues.slice(newPackedValues.length)) : newPackedValues;
	packedValues.prefixes = read();
	packedValues.suffixes = read();
	return read()
};
packedTable.handlesRead = true;
currentExtensions[51] = packedTable;
currentExtensions[PACKED_REFERENCE_TAG_ID] = (data) => {
	if (!packedValues) {
		if (currentDecoder.getShared)
			loadShared();
		else
			return new Tag(data, PACKED_REFERENCE_TAG_ID)
	}
	if (typeof data == 'number')
		return packedValues[16 + (data >= 0 ? 2 * data : (-2 * data - 1))]
	let error = new Error('No support for non-integer packed references yet');
	if (data === undefined)
		error.incomplete = true;
	throw error
};
currentExtensions[28] = (read) => {
	if (!referenceMap) {
		referenceMap = new Map();
		referenceMap.id = 0;
	}
	let id = referenceMap.id++;
	let startingPosition = position$1;
	let token = src[position$1];
	let target;
	if ((token >> 5) == 4)
		target = [];
	else
		target = {};
	let refEntry = { target };
	referenceMap.set(id, refEntry);
	let targetProperties = read();
	if (refEntry.used) {
		if (Object.getPrototypeOf(target) !== Object.getPrototypeOf(targetProperties)) {
			position$1 = startingPosition;
			target = targetProperties;
			referenceMap.set(id, { target });
			targetProperties = read();
		}
		return Object.assign(target, targetProperties)
	}
	refEntry.target = targetProperties;
	return targetProperties
};
currentExtensions[28].handlesRead = true;
currentExtensions[29] = (id) => {
	let refEntry = referenceMap.get(id);
	refEntry.used = true;
	return refEntry.target
};
currentExtensions[258] = (array) => new Set(array);
(currentExtensions[259] = (read) => {
	if (currentDecoder.mapsAsObjects) {
		currentDecoder.mapsAsObjects = false;
		restoreMapsAsObject = true;
	}
	return read()
}).handlesRead = true;
function combine(a, b) {
	if (typeof a === 'string')
		return a + b
	if (a instanceof Array)
		return a.concat(b)
	return Object.assign({}, a, b)
}
function getPackedValues() {
	if (!packedValues) {
		if (currentDecoder.getShared)
			loadShared();
		else
			throw new Error('No packed values available')
	}
	return packedValues
}
const SHARED_DATA_TAG_ID = 0x53687264;
currentExtensionRanges.push((tag, input) => {
	if (tag >= 225 && tag <= 255)
		return combine(getPackedValues().prefixes[tag - 224], input)
	if (tag >= 28704 && tag <= 32767)
		return combine(getPackedValues().prefixes[tag - 28672], input)
	if (tag >= 1879052288 && tag <= 2147483647)
		return combine(getPackedValues().prefixes[tag - 1879048192], input)
	if (tag >= 216 && tag <= 223)
		return combine(input, getPackedValues().suffixes[tag - 216])
	if (tag >= 27647 && tag <= 28671)
		return combine(input, getPackedValues().suffixes[tag - 27639])
	if (tag >= 1811940352 && tag <= 1879048191)
		return combine(input, getPackedValues().suffixes[tag - 1811939328])
	if (tag == SHARED_DATA_TAG_ID) {
		return {
			packedValues: packedValues,
			structures: currentStructures.slice(0),
			version: input,
		}
	}
	if (tag == 55799)
		return input
});
const isLittleEndianMachine$1 = new Uint8Array(new Uint16Array([1]).buffer)[0] == 1;
const typedArrays = [Uint8Array, Uint8ClampedArray, Uint16Array, Uint32Array,
	typeof BigUint64Array == 'undefined' ? { name:'BigUint64Array' } : BigUint64Array, Int8Array, Int16Array, Int32Array,
	typeof BigInt64Array == 'undefined' ? { name:'BigInt64Array' } : BigInt64Array, Float32Array, Float64Array];
const typedArrayTags = [64, 68, 69, 70, 71, 72, 77, 78, 79, 85, 86];
for (let i = 0; i < typedArrays.length; i++) {
	registerTypedArray(typedArrays[i], typedArrayTags[i]);
}
function registerTypedArray(TypedArray, tag) {
	let dvMethod = 'get' + TypedArray.name.slice(0, -5);
	let bytesPerElement;
	if (typeof TypedArray === 'function')
		bytesPerElement = TypedArray.BYTES_PER_ELEMENT;
	else
		TypedArray = null;
	for (let littleEndian = 0; littleEndian < 2; littleEndian++) {
		if (!littleEndian && bytesPerElement == 1)
			continue
		let sizeShift = bytesPerElement == 2 ? 1 : bytesPerElement == 4 ? 2 : bytesPerElement == 8 ? 3 : 0;
		currentExtensions[littleEndian ? tag : (tag - 4)] = (bytesPerElement == 1 || littleEndian == isLittleEndianMachine$1) ? (buffer) => {
			if (!TypedArray)
				throw new Error('Could not find typed array for code ' + tag)
			if (!currentDecoder.copyBuffers) {
				if (bytesPerElement === 1 ||
					bytesPerElement === 2 && !(buffer.byteOffset & 1) ||
					bytesPerElement === 4 && !(buffer.byteOffset & 3) ||
					bytesPerElement === 8 && !(buffer.byteOffset & 7))
					return new TypedArray(buffer.buffer, buffer.byteOffset, buffer.byteLength >> sizeShift);
			}
			return new TypedArray(Uint8Array.prototype.slice.call(buffer, 0).buffer)
		} : buffer => {
			if (!TypedArray)
				throw new Error('Could not find typed array for code ' + tag)
			let dv = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
			let elements = buffer.length >> sizeShift;
			let ta = new TypedArray(elements);
			let method = dv[dvMethod];
			for (let i = 0; i < elements; i++) {
				ta[i] = method.call(dv, i << sizeShift, littleEndian);
			}
			return ta
		};
	}
}
function readBundleExt() {
	let length = readJustLength();
	let bundlePosition = position$1 + read();
	for (let i = 2; i < length; i++) {
		let bundleLength = readJustLength();
		position$1 += bundleLength;
	}
	let dataPosition = position$1;
	position$1 = bundlePosition;
	bundledStrings$1 = [readStringJS(readJustLength()), readStringJS(readJustLength())];
	bundledStrings$1.position0 = 0;
	bundledStrings$1.position1 = 0;
	bundledStrings$1.postBundlePosition = position$1;
	position$1 = dataPosition;
	return read()
}
function readJustLength() {
	let token = src[position$1++] & 0x1f;
	if (token > 0x17) {
		switch (token) {
			case 0x18:
				token = src[position$1++];
				break
			case 0x19:
				token = dataView.getUint16(position$1);
				position$1 += 2;
				break
			case 0x1a:
				token = dataView.getUint32(position$1);
				position$1 += 4;
				break
		}
	}
	return token
}
function loadShared() {
	if (currentDecoder.getShared) {
		let sharedData = saveState(() => {
			src = null;
			return currentDecoder.getShared()
		}) || {};
		let updatedStructures = sharedData.structures || [];
		currentDecoder.sharedVersion = sharedData.version;
		packedValues = currentDecoder.sharedValues = sharedData.packedValues;
		if (currentStructures === true)
			currentDecoder.structures = currentStructures = updatedStructures;
		else
			currentStructures.splice.apply(currentStructures, [0, updatedStructures.length].concat(updatedStructures));
	}
}
function saveState(callback) {
	let savedSrcEnd = srcEnd;
	let savedPosition = position$1;
	let savedSrcStringStart = srcStringStart;
	let savedSrcStringEnd = srcStringEnd;
	let savedSrcString = srcString;
	let savedReferenceMap = referenceMap;
	let savedBundledStrings = bundledStrings$1;
	let savedSrc = new Uint8Array(src.slice(0, srcEnd));
	let savedStructures = currentStructures;
	let savedDecoder = currentDecoder;
	let savedSequentialMode = sequentialMode;
	let value = callback();
	srcEnd = savedSrcEnd;
	position$1 = savedPosition;
	srcStringStart = savedSrcStringStart;
	srcStringEnd = savedSrcStringEnd;
	srcString = savedSrcString;
	referenceMap = savedReferenceMap;
	bundledStrings$1 = savedBundledStrings;
	src = savedSrc;
	sequentialMode = savedSequentialMode;
	currentStructures = savedStructures;
	currentDecoder = savedDecoder;
	dataView = new DataView(src.buffer, src.byteOffset, src.byteLength);
	return value
}
function clearSource() {
	src = null;
	referenceMap = null;
	currentStructures = null;
}
const mult10 = new Array(147);
for (let i = 0; i < 256; i++) {
	mult10[i] = +('1e' + Math.floor(45.15 - i * 0.30103));
}
let defaultDecoder = new Decoder({ useRecords: false });
const decode = defaultDecoder.decode;

let textEncoder;
try {
	textEncoder = new TextEncoder();
} catch (error) {}
let extensions, extensionClasses;
const Buffer$1 = typeof globalThis === 'object' && globalThis.Buffer;
const hasNodeBuffer = typeof Buffer$1 !== 'undefined';
const ByteArrayAllocate = hasNodeBuffer ? Buffer$1.allocUnsafeSlow : Uint8Array;
const ByteArray = hasNodeBuffer ? Buffer$1 : Uint8Array;
const MAX_STRUCTURES = 0x100;
const MAX_BUFFER_SIZE = hasNodeBuffer ? 0x100000000 : 0x7fd00000;
let throwOnIterable;
let target;
let targetView;
let position = 0;
let safeEnd;
let bundledStrings = null;
const MAX_BUNDLE_SIZE = 0xf000;
const hasNonLatin = /[\u0080-\uFFFF]/;
const RECORD_SYMBOL = Symbol('record-id');
class Encoder extends Decoder {
	constructor(options) {
		super(options);
		this.offset = 0;
		let start;
		let sharedStructures;
		let hasSharedUpdate;
		let structures;
		let referenceMap;
		options = options || {};
		let encodeUtf8 = ByteArray.prototype.utf8Write ? function(string, position, maxBytes) {
			return target.utf8Write(string, position, maxBytes)
		} : (textEncoder && textEncoder.encodeInto) ?
			function(string, position) {
				return textEncoder.encodeInto(string, target.subarray(position)).written
			} : false;
		let encoder = this;
		let hasSharedStructures = options.structures || options.saveStructures;
		let maxSharedStructures = options.maxSharedStructures;
		if (maxSharedStructures == null)
			maxSharedStructures = hasSharedStructures ? 128 : 0;
		if (maxSharedStructures > 8190)
			throw new Error('Maximum maxSharedStructure is 8190')
		let isSequential = options.sequential;
		if (isSequential) {
			maxSharedStructures = 0;
		}
		if (!this.structures)
			this.structures = [];
		if (this.saveStructures)
			this.saveShared = this.saveStructures;
		let samplingPackedValues, packedObjectMap, sharedValues = options.sharedValues;
		let sharedPackedObjectMap;
		if (sharedValues) {
			sharedPackedObjectMap = Object.create(null);
			for (let i = 0, l = sharedValues.length; i < l; i++) {
				sharedPackedObjectMap[sharedValues[i]] = i;
			}
		}
		let recordIdsToRemove = [];
		let transitionsCount = 0;
		let serializationsSinceTransitionRebuild = 0;
		this.mapEncode = function(value, encodeOptions) {
			if (this._keyMap && !this._mapped) {
				switch (value.constructor.name) {
					case 'Array':
						value = value.map(r => this.encodeKeys(r));
						break
				}
			}
			return this.encode(value, encodeOptions)
		};
		this.encode = function(value, encodeOptions)	{
			if (!target) {
				target = new ByteArrayAllocate(8192);
				targetView = new DataView(target.buffer, 0, 8192);
				position = 0;
			}
			safeEnd = target.length - 10;
			if (safeEnd - position < 0x800) {
				target = new ByteArrayAllocate(target.length);
				targetView = new DataView(target.buffer, 0, target.length);
				safeEnd = target.length - 10;
				position = 0;
			} else if (encodeOptions === REUSE_BUFFER_MODE)
				position = (position + 7) & 0x7ffffff8;
			start = position;
			if (encoder.useSelfDescribedHeader) {
				targetView.setUint32(position, 0xd9d9f700);
				position += 3;
			}
			referenceMap = encoder.structuredClone ? new Map() : null;
			if (encoder.bundleStrings && typeof value !== 'string') {
				bundledStrings = [];
				bundledStrings.size = Infinity;
			} else
				bundledStrings = null;
			sharedStructures = encoder.structures;
			if (sharedStructures) {
				if (sharedStructures.uninitialized) {
					let sharedData = encoder.getShared() || {};
					encoder.structures = sharedStructures = sharedData.structures || [];
					encoder.sharedVersion = sharedData.version;
					let sharedValues = encoder.sharedValues = sharedData.packedValues;
					if (sharedValues) {
						sharedPackedObjectMap = {};
						for (let i = 0, l = sharedValues.length; i < l; i++)
							sharedPackedObjectMap[sharedValues[i]] = i;
					}
				}
				let sharedStructuresLength = sharedStructures.length;
				if (sharedStructuresLength > maxSharedStructures && !isSequential)
					sharedStructuresLength = maxSharedStructures;
				if (!sharedStructures.transitions) {
					sharedStructures.transitions = Object.create(null);
					for (let i = 0; i < sharedStructuresLength; i++) {
						let keys = sharedStructures[i];
						if (!keys)
							continue
						let nextTransition, transition = sharedStructures.transitions;
						for (let j = 0, l = keys.length; j < l; j++) {
							if (transition[RECORD_SYMBOL] === undefined)
								transition[RECORD_SYMBOL] = i;
							let key = keys[j];
							nextTransition = transition[key];
							if (!nextTransition) {
								nextTransition = transition[key] = Object.create(null);
							}
							transition = nextTransition;
						}
						transition[RECORD_SYMBOL] = i | 0x100000;
					}
				}
				if (!isSequential)
					sharedStructures.nextId = sharedStructuresLength;
			}
			if (hasSharedUpdate)
				hasSharedUpdate = false;
			structures = sharedStructures || [];
			packedObjectMap = sharedPackedObjectMap;
			if (options.pack) {
				let packedValues = new Map();
				packedValues.values = [];
				packedValues.encoder = encoder;
				packedValues.maxValues = options.maxPrivatePackedValues || (sharedPackedObjectMap ? 16 : Infinity);
				packedValues.objectMap = sharedPackedObjectMap || false;
				packedValues.samplingPackedValues = samplingPackedValues;
				findRepetitiveStrings(value, packedValues);
				if (packedValues.values.length > 0) {
					target[position++] = 0xd8;
					target[position++] = 51;
					writeArrayHeader(4);
					let valuesArray = packedValues.values;
					encode(valuesArray);
					writeArrayHeader(0);
					writeArrayHeader(0);
					packedObjectMap = Object.create(sharedPackedObjectMap || null);
					for (let i = 0, l = valuesArray.length; i < l; i++) {
						packedObjectMap[valuesArray[i]] = i;
					}
				}
			}
			throwOnIterable = encodeOptions & THROW_ON_ITERABLE;
			try {
				if (throwOnIterable)
					return;
				encode(value);
				if (bundledStrings) {
					writeBundles(start, encode);
				}
				encoder.offset = position;
				if (referenceMap && referenceMap.idsToInsert) {
					position += referenceMap.idsToInsert.length * 2;
					if (position > safeEnd)
						makeRoom(position);
					encoder.offset = position;
					let serialized = insertIds(target.subarray(start, position), referenceMap.idsToInsert);
					referenceMap = null;
					return serialized
				}
				if (encodeOptions & REUSE_BUFFER_MODE) {
					target.start = start;
					target.end = position;
					return target
				}
				return target.subarray(start, position)
			} finally {
				if (sharedStructures) {
					if (serializationsSinceTransitionRebuild < 10)
						serializationsSinceTransitionRebuild++;
					if (sharedStructures.length > maxSharedStructures)
						sharedStructures.length = maxSharedStructures;
					if (transitionsCount > 10000) {
						sharedStructures.transitions = null;
						serializationsSinceTransitionRebuild = 0;
						transitionsCount = 0;
						if (recordIdsToRemove.length > 0)
							recordIdsToRemove = [];
					} else if (recordIdsToRemove.length > 0 && !isSequential) {
						for (let i = 0, l = recordIdsToRemove.length; i < l; i++) {
							recordIdsToRemove[i][RECORD_SYMBOL] = undefined;
						}
						recordIdsToRemove = [];
					}
				}
				if (hasSharedUpdate && encoder.saveShared) {
					if (encoder.structures.length > maxSharedStructures) {
						encoder.structures = encoder.structures.slice(0, maxSharedStructures);
					}
					let returnBuffer = target.subarray(start, position);
					if (encoder.updateSharedData() === false)
						return encoder.encode(value)
					return returnBuffer
				}
				if (encodeOptions & RESET_BUFFER_MODE)
					position = start;
			}
		};
		this.findCommonStringsToPack = () => {
			samplingPackedValues = new Map();
			if (!sharedPackedObjectMap)
				sharedPackedObjectMap = Object.create(null);
			return (options) => {
				let threshold = options && options.threshold || 4;
				let position = this.pack ? options.maxPrivatePackedValues || 16 : 0;
				if (!sharedValues)
					sharedValues = this.sharedValues = [];
				for (let [ key, status ] of samplingPackedValues) {
					if (status.count > threshold) {
						sharedPackedObjectMap[key] = position++;
						sharedValues.push(key);
						hasSharedUpdate = true;
					}
				}
				while (this.saveShared && this.updateSharedData() === false) {}
				samplingPackedValues = null;
			}
		};
		const encode = (value) => {
			if (position > safeEnd)
				target = makeRoom(position);
			var type = typeof value;
			var length;
			if (type === 'string') {
				if (packedObjectMap) {
					let packedPosition = packedObjectMap[value];
					if (packedPosition >= 0) {
						if (packedPosition < 16)
							target[position++] = packedPosition + 0xe0;
						else {
							target[position++] = 0xc6;
							if (packedPosition & 1)
								encode((15 - packedPosition) >> 1);
							else
								encode((packedPosition - 16) >> 1);
						}
						return
					} else if (samplingPackedValues && !options.pack) {
						let status = samplingPackedValues.get(value);
						if (status)
							status.count++;
						else
							samplingPackedValues.set(value, {
								count: 1,
							});
					}
				}
				let strLength = value.length;
				if (bundledStrings && strLength >= 4 && strLength < 0x400) {
					if ((bundledStrings.size += strLength) > MAX_BUNDLE_SIZE) {
						let extStart;
						let maxBytes = (bundledStrings[0] ? bundledStrings[0].length * 3 + bundledStrings[1].length : 0) + 10;
						if (position + maxBytes > safeEnd)
							target = makeRoom(position + maxBytes);
						target[position++] = 0xd9;
						target[position++] = 0xdf;
						target[position++] = 0xf9;
						target[position++] = bundledStrings.position ? 0x84 : 0x82;
						target[position++] = 0x1a;
						extStart = position - start;
						position += 4;
						if (bundledStrings.position) {
							writeBundles(start, encode);
						}
						bundledStrings = ['', ''];
						bundledStrings.size = 0;
						bundledStrings.position = extStart;
					}
					let twoByte = hasNonLatin.test(value);
					bundledStrings[twoByte ? 0 : 1] += value;
					target[position++] = twoByte ? 0xce : 0xcf;
					encode(strLength);
					return
				}
				let headerSize;
				if (strLength < 0x20) {
					headerSize = 1;
				} else if (strLength < 0x100) {
					headerSize = 2;
				} else if (strLength < 0x10000) {
					headerSize = 3;
				} else {
					headerSize = 5;
				}
				let maxBytes = strLength * 3;
				if (position + maxBytes > safeEnd)
					target = makeRoom(position + maxBytes);
				if (strLength < 0x40 || !encodeUtf8) {
					let i, c1, c2, strPosition = position + headerSize;
					for (i = 0; i < strLength; i++) {
						c1 = value.charCodeAt(i);
						if (c1 < 0x80) {
							target[strPosition++] = c1;
						} else if (c1 < 0x800) {
							target[strPosition++] = c1 >> 6 | 0xc0;
							target[strPosition++] = c1 & 0x3f | 0x80;
						} else if (
							(c1 & 0xfc00) === 0xd800 &&
							((c2 = value.charCodeAt(i + 1)) & 0xfc00) === 0xdc00
						) {
							c1 = 0x10000 + ((c1 & 0x03ff) << 10) + (c2 & 0x03ff);
							i++;
							target[strPosition++] = c1 >> 18 | 0xf0;
							target[strPosition++] = c1 >> 12 & 0x3f | 0x80;
							target[strPosition++] = c1 >> 6 & 0x3f | 0x80;
							target[strPosition++] = c1 & 0x3f | 0x80;
						} else {
							target[strPosition++] = c1 >> 12 | 0xe0;
							target[strPosition++] = c1 >> 6 & 0x3f | 0x80;
							target[strPosition++] = c1 & 0x3f | 0x80;
						}
					}
					length = strPosition - position - headerSize;
				} else {
					length = encodeUtf8(value, position + headerSize, maxBytes);
				}
				if (length < 0x18) {
					target[position++] = 0x60 | length;
				} else if (length < 0x100) {
					if (headerSize < 2) {
						target.copyWithin(position + 2, position + 1, position + 1 + length);
					}
					target[position++] = 0x78;
					target[position++] = length;
				} else if (length < 0x10000) {
					if (headerSize < 3) {
						target.copyWithin(position + 3, position + 2, position + 2 + length);
					}
					target[position++] = 0x79;
					target[position++] = length >> 8;
					target[position++] = length & 0xff;
				} else {
					if (headerSize < 5) {
						target.copyWithin(position + 5, position + 3, position + 3 + length);
					}
					target[position++] = 0x7a;
					targetView.setUint32(position, length);
					position += 4;
				}
				position += length;
			} else if (type === 'number') {
				if (!this.alwaysUseFloat && value >>> 0 === value) {
					if (value < 0x18) {
						target[position++] = value;
					} else if (value < 0x100) {
						target[position++] = 0x18;
						target[position++] = value;
					} else if (value < 0x10000) {
						target[position++] = 0x19;
						target[position++] = value >> 8;
						target[position++] = value & 0xff;
					} else {
						target[position++] = 0x1a;
						targetView.setUint32(position, value);
						position += 4;
					}
				} else if (!this.alwaysUseFloat && value >> 0 === value) {
					if (value >= -24) {
						target[position++] = 0x1f - value;
					} else if (value >= -256) {
						target[position++] = 0x38;
						target[position++] = ~value;
					} else if (value >= -65536) {
						target[position++] = 0x39;
						targetView.setUint16(position, ~value);
						position += 2;
					} else {
						target[position++] = 0x3a;
						targetView.setUint32(position, ~value);
						position += 4;
					}
				} else {
					let useFloat32;
					if ((useFloat32 = this.useFloat32) > 0 && value < 0x100000000 && value >= -2147483648) {
						target[position++] = 0xfa;
						targetView.setFloat32(position, value);
						let xShifted;
						if (useFloat32 < 4 ||
								((xShifted = value * mult10[((target[position] & 0x7f) << 1) | (target[position + 1] >> 7)]) >> 0) === xShifted) {
							position += 4;
							return
						} else
							position--;
					}
					target[position++] = 0xfb;
					targetView.setFloat64(position, value);
					position += 8;
				}
			} else if (type === 'object') {
				if (!value)
					target[position++] = 0xf6;
				else {
					if (referenceMap) {
						let referee = referenceMap.get(value);
						if (referee) {
							target[position++] = 0xd8;
							target[position++] = 29;
							target[position++] = 0x19;
							if (!referee.references) {
								let idsToInsert = referenceMap.idsToInsert || (referenceMap.idsToInsert = []);
								referee.references = [];
								idsToInsert.push(referee);
							}
							referee.references.push(position - start);
							position += 2;
							return
						} else
							referenceMap.set(value, { offset: position - start });
					}
					let constructor = value.constructor;
					if (constructor === Object) {
						writeObject(value);
					} else if (constructor === Array) {
						length = value.length;
						if (length < 0x18) {
							target[position++] = 0x80 | length;
						} else {
							writeArrayHeader(length);
						}
						for (let i = 0; i < length; i++) {
							encode(value[i]);
						}
					} else if (constructor === Map) {
						if (this.mapsAsObjects ? this.useTag259ForMaps !== false : this.useTag259ForMaps) {
							target[position++] = 0xd9;
							target[position++] = 1;
							target[position++] = 3;
						}
						length = value.size;
						if (length < 0x18) {
							target[position++] = 0xa0 | length;
						} else if (length < 0x100) {
							target[position++] = 0xb8;
							target[position++] = length;
						} else if (length < 0x10000) {
							target[position++] = 0xb9;
							target[position++] = length >> 8;
							target[position++] = length & 0xff;
						} else {
							target[position++] = 0xba;
							targetView.setUint32(position, length);
							position += 4;
						}
						if (encoder.keyMap) {
							for (let [ key, entryValue ] of value) {
								encode(encoder.encodeKey(key));
								encode(entryValue);
							}
						} else {
							for (let [ key, entryValue ] of value) {
								encode(key);
								encode(entryValue);
							}
						}
					} else {
						for (let i = 0, l = extensions.length; i < l; i++) {
							let extensionClass = extensionClasses[i];
							if (value instanceof extensionClass) {
								let extension = extensions[i];
								let tag = extension.tag;
								if (tag == undefined)
									tag = extension.getTag && extension.getTag.call(this, value);
								if (tag < 0x18) {
									target[position++] = 0xc0 | tag;
								} else if (tag < 0x100) {
									target[position++] = 0xd8;
									target[position++] = tag;
								} else if (tag < 0x10000) {
									target[position++] = 0xd9;
									target[position++] = tag >> 8;
									target[position++] = tag & 0xff;
								} else if (tag > -1) {
									target[position++] = 0xda;
									targetView.setUint32(position, tag);
									position += 4;
								}
								extension.encode.call(this, value, encode, makeRoom);
								return
							}
						}
						if (value[Symbol.iterator]) {
							if (throwOnIterable) {
								let error = new Error('Iterable should be serialized as iterator');
								error.iteratorNotHandled = true;
								throw error;
							}
							target[position++] = 0x9f;
							for (let entry of value) {
								encode(entry);
							}
							target[position++] = 0xff;
							return
						}
						if (value[Symbol.asyncIterator] || isBlob(value)) {
							let error = new Error('Iterable/blob should be serialized as iterator');
							error.iteratorNotHandled = true;
							throw error;
						}
						if (this.useToJSON && value.toJSON) {
							const json = value.toJSON();
							if (json !== value)
								return encode(json)
						}
						writeObject(value);
					}
				}
			} else if (type === 'boolean') {
				target[position++] = value ? 0xf5 : 0xf4;
			} else if (type === 'bigint') {
				if (value < (BigInt(1)<<BigInt(64)) && value >= 0) {
					target[position++] = 0x1b;
					targetView.setBigUint64(position, value);
				} else if (value > -(BigInt(1)<<BigInt(64)) && value < 0) {
					target[position++] = 0x3b;
					targetView.setBigUint64(position, -value - BigInt(1));
				} else {
					if (this.largeBigIntToFloat) {
						target[position++] = 0xfb;
						targetView.setFloat64(position, Number(value));
					} else {
						if (value >= BigInt(0))
							target[position++] = 0xc2;
						else {
							target[position++] = 0xc3;
							value = BigInt(-1) - value;
						}
						let bytes = [];
						while (value) {
							bytes.push(Number(value & BigInt(0xff)));
							value >>= BigInt(8);
						}
						writeBuffer(new Uint8Array(bytes.reverse()), makeRoom);
						return;
					}
				}
				position += 8;
			} else if (type === 'undefined') {
				target[position++] = 0xf7;
			} else {
				throw new Error('Unknown type: ' + type)
			}
		};
		const writeObject = this.useRecords === false ? this.variableMapSize ? (object) => {
			let keys = Object.keys(object);
			let vals = Object.values(object);
			let length = keys.length;
			if (length < 0x18) {
				target[position++] = 0xa0 | length;
			} else if (length < 0x100) {
				target[position++] = 0xb8;
				target[position++] = length;
			} else if (length < 0x10000) {
				target[position++] = 0xb9;
				target[position++] = length >> 8;
				target[position++] = length & 0xff;
			} else {
				target[position++] = 0xba;
				targetView.setUint32(position, length);
				position += 4;
			}
			if (encoder.keyMap) {
				for (let i = 0; i < length; i++) {
					encode(encoder.encodeKey(keys[i]));
					encode(vals[i]);
				}
			} else {
				for (let i = 0; i < length; i++) {
					encode(keys[i]);
					encode(vals[i]);
				}
			}
		} :
		(object) => {
			target[position++] = 0xb9;
			let objectOffset = position - start;
			position += 2;
			let size = 0;
			if (encoder.keyMap) {
				for (let key in object) if (typeof object.hasOwnProperty !== 'function' || object.hasOwnProperty(key)) {
					encode(encoder.encodeKey(key));
					encode(object[key]);
					size++;
				}
			} else {
				for (let key in object) if (typeof object.hasOwnProperty !== 'function' || object.hasOwnProperty(key)) {
						encode(key);
						encode(object[key]);
					size++;
				}
			}
			target[objectOffset++ + start] = size >> 8;
			target[objectOffset + start] = size & 0xff;
		} :
		(object, skipValues) => {
			let nextTransition, transition = structures.transitions || (structures.transitions = Object.create(null));
			let newTransitions = 0;
			let length = 0;
			let parentRecordId;
			let keys;
			if (this.keyMap) {
				keys = Object.keys(object).map(k => this.encodeKey(k));
				length = keys.length;
				for (let i = 0; i < length; i++) {
					let key = keys[i];
					nextTransition = transition[key];
					if (!nextTransition) {
						nextTransition = transition[key] = Object.create(null);
						newTransitions++;
					}
					transition = nextTransition;
				}
			} else {
				for (let key in object) if (typeof object.hasOwnProperty !== 'function' || object.hasOwnProperty(key)) {
					nextTransition = transition[key];
					if (!nextTransition) {
						if (transition[RECORD_SYMBOL] & 0x100000) {
							parentRecordId = transition[RECORD_SYMBOL] & 0xffff;
						}
						nextTransition = transition[key] = Object.create(null);
						newTransitions++;
					}
					transition = nextTransition;
					length++;
				}
			}
			let recordId = transition[RECORD_SYMBOL];
			if (recordId !== undefined) {
				recordId &= 0xffff;
				target[position++] = 0xd9;
				target[position++] = (recordId >> 8) | 0xe0;
				target[position++] = recordId & 0xff;
			} else {
				if (!keys)
					keys = transition.__keys__ || (transition.__keys__ = Object.keys(object));
				if (parentRecordId === undefined) {
					recordId = structures.nextId++;
					if (!recordId) {
						recordId = 0;
						structures.nextId = 1;
					}
					if (recordId >= MAX_STRUCTURES) {
						structures.nextId = (recordId = maxSharedStructures) + 1;
					}
				} else {
					recordId = parentRecordId;
				}
				structures[recordId] = keys;
				if (recordId < maxSharedStructures) {
					target[position++] = 0xd9;
					target[position++] = (recordId >> 8) | 0xe0;
					target[position++] = recordId & 0xff;
					transition = structures.transitions;
					for (let i = 0; i < length; i++) {
						if (transition[RECORD_SYMBOL] === undefined || (transition[RECORD_SYMBOL] & 0x100000))
							transition[RECORD_SYMBOL] = recordId;
						transition = transition[keys[i]];
					}
					transition[RECORD_SYMBOL] = recordId | 0x100000;
					hasSharedUpdate = true;
				} else {
					transition[RECORD_SYMBOL] = recordId;
					targetView.setUint32(position, 0xd9dfff00);
					position += 3;
					if (newTransitions)
						transitionsCount += serializationsSinceTransitionRebuild * newTransitions;
					if (recordIdsToRemove.length >= MAX_STRUCTURES - maxSharedStructures)
						recordIdsToRemove.shift()[RECORD_SYMBOL] = undefined;
					recordIdsToRemove.push(transition);
					writeArrayHeader(length + 2);
					encode(0xe000 + recordId);
					encode(keys);
					if (skipValues) return;
					for (let key in object)
						if (typeof object.hasOwnProperty !== 'function' || object.hasOwnProperty(key))
							encode(object[key]);
					return
				}
			}
			if (length < 0x18) {
				target[position++] = 0x80 | length;
			} else {
				writeArrayHeader(length);
			}
			if (skipValues) return;
			for (let key in object)
				if (typeof object.hasOwnProperty !== 'function' || object.hasOwnProperty(key))
					encode(object[key]);
		};
		const makeRoom = (end) => {
			let newSize;
			if (end > 0x1000000) {
				if ((end - start) > MAX_BUFFER_SIZE)
					throw new Error('Encoded buffer would be larger than maximum buffer size')
				newSize = Math.min(MAX_BUFFER_SIZE,
					Math.round(Math.max((end - start) * (end > 0x4000000 ? 1.25 : 2), 0x400000) / 0x1000) * 0x1000);
			} else
				newSize = ((Math.max((end - start) << 2, target.length - 1) >> 12) + 1) << 12;
			let newBuffer = new ByteArrayAllocate(newSize);
			targetView = new DataView(newBuffer.buffer, 0, newSize);
			if (target.copy)
				target.copy(newBuffer, 0, start, end);
			else
				newBuffer.set(target.slice(start, end));
			position -= start;
			start = 0;
			safeEnd = newBuffer.length - 10;
			return target = newBuffer
		};
		let chunkThreshold = 100;
		let continuedChunkThreshold = 1000;
		this.encodeAsIterable = function(value, options) {
			return startEncoding(value, options, encodeObjectAsIterable);
		};
		this.encodeAsAsyncIterable = function(value, options) {
			return startEncoding(value, options, encodeObjectAsAsyncIterable);
		};
		function* encodeObjectAsIterable(object, iterateProperties, finalIterable) {
			let constructor = object.constructor;
			if (constructor === Object) {
				let useRecords = encoder.useRecords !== false;
				if (useRecords)
					writeObject(object, true);
				else
					writeEntityLength(Object.keys(object).length, 0xa0);
				for (let key in object) {
					let value = object[key];
					if (!useRecords) encode(key);
					if (value && typeof value === 'object') {
						if (iterateProperties[key])
							yield* encodeObjectAsIterable(value, iterateProperties[key]);
						else
							yield* tryEncode(value, iterateProperties, key);
					} else encode(value);
				}
			} else if (constructor === Array) {
				let length = object.length;
				writeArrayHeader(length);
				for (let i = 0; i < length; i++) {
					let value = object[i];
					if (value && (typeof value === 'object' || position - start > chunkThreshold)) {
						if (iterateProperties.element)
							yield* encodeObjectAsIterable(value, iterateProperties.element);
						else
							yield* tryEncode(value, iterateProperties, 'element');
					} else encode(value);
				}
			} else if (object[Symbol.iterator] && !object.buffer) {
				target[position++] = 0x9f;
				for (let value of object) {
					if (value && (typeof value === 'object' || position - start > chunkThreshold)) {
						if (iterateProperties.element)
							yield* encodeObjectAsIterable(value, iterateProperties.element);
						else
							yield* tryEncode(value, iterateProperties, 'element');
					} else encode(value);
				}
				target[position++] = 0xff;
			} else if (isBlob(object)){
				writeEntityLength(object.size, 0x40);
				yield target.subarray(start, position);
				yield object;
				restartEncoding();
			} else if (object[Symbol.asyncIterator]) {
				target[position++] = 0x9f;
				yield target.subarray(start, position);
				yield object;
				restartEncoding();
				target[position++] = 0xff;
			} else {
				encode(object);
			}
			if (finalIterable && position > start) yield target.subarray(start, position);
			else if (position - start > chunkThreshold) {
				yield target.subarray(start, position);
				restartEncoding();
			}
		}
		function* tryEncode(value, iterateProperties, key) {
			let restart = position - start;
			try {
				encode(value);
				if (position - start > chunkThreshold) {
					yield target.subarray(start, position);
					restartEncoding();
				}
			} catch (error) {
				if (error.iteratorNotHandled) {
					iterateProperties[key] = {};
					position = start + restart;
					yield* encodeObjectAsIterable.call(this, value, iterateProperties[key]);
				} else throw error;
			}
		}
		function restartEncoding() {
			chunkThreshold = continuedChunkThreshold;
			encoder.encode(null, THROW_ON_ITERABLE);
		}
		function startEncoding(value, options, encodeIterable) {
			if (options && options.chunkThreshold)
				chunkThreshold = continuedChunkThreshold = options.chunkThreshold;
			else
				chunkThreshold = 100;
			if (value && typeof value === 'object') {
				encoder.encode(null, THROW_ON_ITERABLE);
				return encodeIterable(value, encoder.iterateProperties || (encoder.iterateProperties = {}), true);
			}
			return [encoder.encode(value)];
		}
		async function* encodeObjectAsAsyncIterable(value, iterateProperties) {
			for (let encodedValue of encodeObjectAsIterable(value, iterateProperties, true)) {
				let constructor = encodedValue.constructor;
				if (constructor === ByteArray || constructor === Uint8Array)
					yield encodedValue;
				else if (isBlob(encodedValue)) {
					let reader = encodedValue.stream().getReader();
					let next;
					while (!(next = await reader.read()).done) {
						yield next.value;
					}
				} else if (encodedValue[Symbol.asyncIterator]) {
					for await (let asyncValue of encodedValue) {
						restartEncoding();
						if (asyncValue)
							yield* encodeObjectAsAsyncIterable(asyncValue, iterateProperties.async || (iterateProperties.async = {}));
						else yield encoder.encode(asyncValue);
					}
				} else {
					yield encodedValue;
				}
			}
		}
	}
	useBuffer(buffer) {
		target = buffer;
		targetView = new DataView(target.buffer, target.byteOffset, target.byteLength);
		position = 0;
	}
	clearSharedData() {
		if (this.structures)
			this.structures = [];
		if (this.sharedValues)
			this.sharedValues = undefined;
	}
	updateSharedData() {
		let lastVersion = this.sharedVersion || 0;
		this.sharedVersion = lastVersion + 1;
		let structuresCopy = this.structures.slice(0);
		let sharedData = new SharedData(structuresCopy, this.sharedValues, this.sharedVersion);
		let saveResults = this.saveShared(sharedData,
				existingShared => (existingShared && existingShared.version || 0) == lastVersion);
		if (saveResults === false) {
			sharedData = this.getShared() || {};
			this.structures = sharedData.structures || [];
			this.sharedValues = sharedData.packedValues;
			this.sharedVersion = sharedData.version;
			this.structures.nextId = this.structures.length;
		} else {
			structuresCopy.forEach((structure, i) => this.structures[i] = structure);
		}
		return saveResults
	}
}
function writeEntityLength(length, majorValue) {
	if (length < 0x18)
		target[position++] = majorValue | length;
	else if (length < 0x100) {
		target[position++] = majorValue | 0x18;
		target[position++] = length;
	} else if (length < 0x10000) {
		target[position++] = majorValue | 0x19;
		target[position++] = length >> 8;
		target[position++] = length & 0xff;
	} else {
		target[position++] = majorValue | 0x1a;
		targetView.setUint32(position, length);
		position += 4;
	}
}
class SharedData {
	constructor(structures, values, version) {
		this.structures = structures;
		this.packedValues = values;
		this.version = version;
	}
}
function writeArrayHeader(length) {
	if (length < 0x18)
		target[position++] = 0x80 | length;
	else if (length < 0x100) {
		target[position++] = 0x98;
		target[position++] = length;
	} else if (length < 0x10000) {
		target[position++] = 0x99;
		target[position++] = length >> 8;
		target[position++] = length & 0xff;
	} else {
		target[position++] = 0x9a;
		targetView.setUint32(position, length);
		position += 4;
	}
}
const BlobConstructor = typeof Blob === 'undefined' ? function(){} : Blob;
function isBlob(object) {
	if (object instanceof BlobConstructor)
		return true;
	let tag = object[Symbol.toStringTag];
	return tag === 'Blob' || tag === 'File';
}
function findRepetitiveStrings(value, packedValues) {
	switch(typeof value) {
		case 'string':
			if (value.length > 3) {
				if (packedValues.objectMap[value] > -1 || packedValues.values.length >= packedValues.maxValues)
					return
				let packedStatus = packedValues.get(value);
				if (packedStatus) {
					if (++packedStatus.count == 2) {
						packedValues.values.push(value);
					}
				} else {
					packedValues.set(value, {
						count: 1,
					});
					if (packedValues.samplingPackedValues) {
						let status = packedValues.samplingPackedValues.get(value);
						if (status)
							status.count++;
						else
							packedValues.samplingPackedValues.set(value, {
								count: 1,
							});
					}
				}
			}
			break
		case 'object':
			if (value) {
				if (value instanceof Array) {
					for (let i = 0, l = value.length; i < l; i++) {
						findRepetitiveStrings(value[i], packedValues);
					}
				} else {
					let includeKeys = !packedValues.encoder.useRecords;
					for (var key in value) {
						if (value.hasOwnProperty(key)) {
							if (includeKeys)
								findRepetitiveStrings(key, packedValues);
							findRepetitiveStrings(value[key], packedValues);
						}
					}
				}
			}
			break
		case 'function': console.log(value);
	}
}
const isLittleEndianMachine = new Uint8Array(new Uint16Array([1]).buffer)[0] == 1;
extensionClasses = [ Date, Set, Error, RegExp, Tag, ArrayBuffer,
	Uint8Array, Uint8ClampedArray, Uint16Array, Uint32Array,
	typeof BigUint64Array == 'undefined' ? function() {} : BigUint64Array, Int8Array, Int16Array, Int32Array,
	typeof BigInt64Array == 'undefined' ? function() {} : BigInt64Array,
	Float32Array, Float64Array, SharedData ];
extensions = [{
	tag: 1,
	encode(date, encode) {
		let seconds = date.getTime() / 1000;
		if ((this.useTimestamp32 || date.getMilliseconds() === 0) && seconds >= 0 && seconds < 0x100000000) {
			target[position++] = 0x1a;
			targetView.setUint32(position, seconds);
			position += 4;
		} else {
			target[position++] = 0xfb;
			targetView.setFloat64(position, seconds);
			position += 8;
		}
	}
}, {
	tag: 258,
	encode(set, encode) {
		let array = Array.from(set);
		encode(array);
	}
}, {
	tag: 27,
	encode(error, encode) {
		encode([ error.name, error.message ]);
	}
}, {
	tag: 27,
	encode(regex, encode) {
		encode([ 'RegExp', regex.source, regex.flags ]);
	}
}, {
	getTag(tag) {
		return tag.tag
	},
	encode(tag, encode) {
		encode(tag.value);
	}
}, {
	encode(arrayBuffer, encode, makeRoom) {
		writeBuffer(arrayBuffer, makeRoom);
	}
}, {
	getTag(typedArray) {
		if (typedArray.constructor === Uint8Array) {
			if (this.tagUint8Array || hasNodeBuffer && this.tagUint8Array !== false)
				return 64;
		}
	},
	encode(typedArray, encode, makeRoom) {
		writeBuffer(typedArray, makeRoom);
	}
},
	typedArrayEncoder(68, 1),
	typedArrayEncoder(69, 2),
	typedArrayEncoder(70, 4),
	typedArrayEncoder(71, 8),
	typedArrayEncoder(72, 1),
	typedArrayEncoder(77, 2),
	typedArrayEncoder(78, 4),
	typedArrayEncoder(79, 8),
	typedArrayEncoder(85, 4),
	typedArrayEncoder(86, 8),
{
	encode(sharedData, encode) {
		let packedValues = sharedData.packedValues || [];
		let sharedStructures = sharedData.structures || [];
		if (packedValues.values.length > 0) {
			target[position++] = 0xd8;
			target[position++] = 51;
			writeArrayHeader(4);
			let valuesArray = packedValues.values;
			encode(valuesArray);
			writeArrayHeader(0);
			writeArrayHeader(0);
			packedObjectMap = Object.create(sharedPackedObjectMap || null);
			for (let i = 0, l = valuesArray.length; i < l; i++) {
				packedObjectMap[valuesArray[i]] = i;
			}
		}
		if (sharedStructures) {
			targetView.setUint32(position, 0xd9dffe00);
			position += 3;
			let definitions = sharedStructures.slice(0);
			definitions.unshift(0xe000);
			definitions.push(new Tag(sharedData.version, 0x53687264));
			encode(definitions);
		} else
			encode(new Tag(sharedData.version, 0x53687264));
		}
	}];
function typedArrayEncoder(tag, size) {
	if (!isLittleEndianMachine && size > 1)
		tag -= 4;
	return {
		tag: tag,
		encode: function writeExtBuffer(typedArray, encode) {
			let length = typedArray.byteLength;
			let offset = typedArray.byteOffset || 0;
			let buffer = typedArray.buffer || typedArray;
			encode(hasNodeBuffer ? Buffer$1.from(buffer, offset, length) :
				new Uint8Array(buffer, offset, length));
		}
	}
}
function writeBuffer(buffer, makeRoom) {
	let length = buffer.byteLength;
	if (length < 0x18) {
		target[position++] = 0x40 + length;
	} else if (length < 0x100) {
		target[position++] = 0x58;
		target[position++] = length;
	} else if (length < 0x10000) {
		target[position++] = 0x59;
		target[position++] = length >> 8;
		target[position++] = length & 0xff;
	} else {
		target[position++] = 0x5a;
		targetView.setUint32(position, length);
		position += 4;
	}
	if (position + length >= target.length) {
		makeRoom(position + length);
	}
	target.set(buffer.buffer ? buffer : new Uint8Array(buffer), position);
	position += length;
}
function insertIds(serialized, idsToInsert) {
	let nextId;
	let distanceToMove = idsToInsert.length * 2;
	let lastEnd = serialized.length - distanceToMove;
	idsToInsert.sort((a, b) => a.offset > b.offset ? 1 : -1);
	for (let id = 0; id < idsToInsert.length; id++) {
		let referee = idsToInsert[id];
		referee.id = id;
		for (let position of referee.references) {
			serialized[position++] = id >> 8;
			serialized[position] = id & 0xff;
		}
	}
	while (nextId = idsToInsert.pop()) {
		let offset = nextId.offset;
		serialized.copyWithin(offset + distanceToMove, offset, lastEnd);
		distanceToMove -= 2;
		let position = offset + distanceToMove;
		serialized[position++] = 0xd8;
		serialized[position++] = 28;
		lastEnd = offset;
	}
	return serialized
}
function writeBundles(start, encode) {
	targetView.setUint32(bundledStrings.position + start, position - bundledStrings.position - start + 1);
	let writeStrings = bundledStrings;
	bundledStrings = null;
	encode(writeStrings[0]);
	encode(writeStrings[1]);
}
let defaultEncoder = new Encoder({ useRecords: false });
const encode = defaultEncoder.encode;
const REUSE_BUFFER_MODE = 512;
const RESET_BUFFER_MODE = 1024;
const THROW_ON_ITERABLE = 2048;

var text_min = {};

var hasRequiredText_min;
function requireText_min () {
	if (hasRequiredText_min) return text_min;
	hasRequiredText_min = 1;
	(function(scope) {	function B(r,e){var f;return r instanceof Buffer?f=r:f=Buffer.from(r.buffer,r.byteOffset,r.byteLength),f.toString(e)}var w=function(r){return Buffer.from(r)};function h(r){for(var e=0,f=Math.min(256*256,r.length+1),n=new Uint16Array(f),i=[],o=0;;){var t=e<r.length;if(!t||o>=f-1){var s=n.subarray(0,o),m=s;if(i.push(String.fromCharCode.apply(null,m)),!t)return i.join("");r=r.subarray(e),e=0,o=0;}var a=r[e++];if((a&128)===0)n[o++]=a;else if((a&224)===192){var d=r[e++]&63;n[o++]=(a&31)<<6|d;}else if((a&240)===224){var d=r[e++]&63,l=r[e++]&63;n[o++]=(a&31)<<12|d<<6|l;}else if((a&248)===240){var d=r[e++]&63,l=r[e++]&63,R=r[e++]&63,c=(a&7)<<18|d<<12|l<<6|R;c>65535&&(c-=65536,n[o++]=c>>>10&1023|55296,c=56320|c&1023),n[o++]=c;}}}function F(r){for(var e=0,f=r.length,n=0,i=Math.max(32,f+(f>>>1)+7),o=new Uint8Array(i>>>3<<3);e<f;){var t=r.charCodeAt(e++);if(t>=55296&&t<=56319){if(e<f){var s=r.charCodeAt(e);(s&64512)===56320&&(++e,t=((t&1023)<<10)+(s&1023)+65536);}if(t>=55296&&t<=56319)continue}if(n+4>o.length){i+=8,i*=1+e/r.length*2,i=i>>>3<<3;var m=new Uint8Array(i);m.set(o),o=m;}if((t&4294967168)===0){o[n++]=t;continue}else if((t&4294965248)===0)o[n++]=t>>>6&31|192;else if((t&4294901760)===0)o[n++]=t>>>12&15|224,o[n++]=t>>>6&63|128;else if((t&4292870144)===0)o[n++]=t>>>18&7|240,o[n++]=t>>>12&63|128,o[n++]=t>>>6&63|128;else continue;o[n++]=t&63|128;}return o.slice?o.slice(0,n):o.subarray(0,n)}var u="Failed to ",p=function(r,e,f){if(r)throw new Error("".concat(u).concat(e,": the '").concat(f,"' option is unsupported."))};var x=typeof Buffer=="function"&&Buffer.from;var A=x?w:F;function v(){this.encoding="utf-8";}v.prototype.encode=function(r,e){return p(e&&e.stream,"encode","stream"),A(r)};function U(r){var e;try{var f=new Blob([r],{type:"text/plain;charset=UTF-8"});e=URL.createObjectURL(f);var n=new XMLHttpRequest;return n.open("GET",e,false),n.send(),n.responseText}finally{e&&URL.revokeObjectURL(e);}}var O=!x&&typeof Blob=="function"&&typeof URL=="function"&&typeof URL.createObjectURL=="function",S=["utf-8","utf8","unicode-1-1-utf-8"],T=h;x?T=B:O&&(T=function(r){try{return U(r)}catch(e){return h(r)}});var y="construct 'TextDecoder'",E="".concat(u," ").concat(y,": the ");function g(r,e){p(e&&e.fatal,y,"fatal"),r=r||"utf-8";var f;if(x?f=Buffer.isEncoding(r):f=S.indexOf(r.toLowerCase())!==-1,!f)throw new RangeError("".concat(E," encoding label provided ('").concat(r,"') is invalid."));this.encoding=r,this.fatal=false,this.ignoreBOM=false;}g.prototype.decode=function(r,e){p(e&&e.stream,"decode","stream");var f;return r instanceof Uint8Array?f=r:r.buffer instanceof ArrayBuffer?f=new Uint8Array(r.buffer):f=new Uint8Array(r),T(f,this.encoding)};scope.TextEncoder=scope.TextEncoder||v;scope.TextDecoder=scope.TextDecoder||g;
	}(typeof window !== 'undefined' ? window : (typeof commonjsGlobal !== 'undefined' ? commonjsGlobal : text_min)));
	return text_min;
}

var text_minExports = /*@__PURE__*/ requireText_min();

/*! pako 2.1.0 https://github.com/nodeca/pako @license (MIT AND Zlib) */
const Z_FIXED$1               = 4;
const Z_BINARY              = 0;
const Z_TEXT                = 1;
const Z_UNKNOWN$1             = 2;
function zero$1(buf) { let len = buf.length; while (--len >= 0) { buf[len] = 0; } }
const STORED_BLOCK = 0;
const STATIC_TREES = 1;
const DYN_TREES    = 2;
const MIN_MATCH$1    = 3;
const MAX_MATCH$1    = 258;
const LENGTH_CODES$1  = 29;
const LITERALS$1      = 256;
const L_CODES$1       = LITERALS$1 + 1 + LENGTH_CODES$1;
const D_CODES$1       = 30;
const BL_CODES$1      = 19;
const HEAP_SIZE$1     = 2 * L_CODES$1 + 1;
const MAX_BITS$1      = 15;
const Buf_size      = 16;
const MAX_BL_BITS = 7;
const END_BLOCK   = 256;
const REP_3_6     = 16;
const REPZ_3_10   = 17;
const REPZ_11_138 = 18;
const extra_lbits =
  new Uint8Array([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0]);
const extra_dbits =
  new Uint8Array([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13]);
const extra_blbits =
  new Uint8Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7]);
const bl_order =
  new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]);
const DIST_CODE_LEN = 512;
const static_ltree  = new Array((L_CODES$1 + 2) * 2);
zero$1(static_ltree);
const static_dtree  = new Array(D_CODES$1 * 2);
zero$1(static_dtree);
const _dist_code    = new Array(DIST_CODE_LEN);
zero$1(_dist_code);
const _length_code  = new Array(MAX_MATCH$1 - MIN_MATCH$1 + 1);
zero$1(_length_code);
const base_length   = new Array(LENGTH_CODES$1);
zero$1(base_length);
const base_dist     = new Array(D_CODES$1);
zero$1(base_dist);
function StaticTreeDesc(static_tree, extra_bits, extra_base, elems, max_length) {
  this.static_tree  = static_tree;
  this.extra_bits   = extra_bits;
  this.extra_base   = extra_base;
  this.elems        = elems;
  this.max_length   = max_length;
  this.has_stree    = static_tree && static_tree.length;
}
let static_l_desc;
let static_d_desc;
let static_bl_desc;
function TreeDesc(dyn_tree, stat_desc) {
  this.dyn_tree = dyn_tree;
  this.max_code = 0;
  this.stat_desc = stat_desc;
}
const d_code = (dist) => {
  return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
};
const put_short = (s, w) => {
  s.pending_buf[s.pending++] = (w) & 0xff;
  s.pending_buf[s.pending++] = (w >>> 8) & 0xff;
};
const send_bits = (s, value, length) => {
  if (s.bi_valid > (Buf_size - length)) {
    s.bi_buf |= (value << s.bi_valid) & 0xffff;
    put_short(s, s.bi_buf);
    s.bi_buf = value >> (Buf_size - s.bi_valid);
    s.bi_valid += length - Buf_size;
  } else {
    s.bi_buf |= (value << s.bi_valid) & 0xffff;
    s.bi_valid += length;
  }
};
const send_code = (s, c, tree) => {
  send_bits(s, tree[c * 2], tree[c * 2 + 1]);
};
const bi_reverse = (code, len) => {
  let res = 0;
  do {
    res |= code & 1;
    code >>>= 1;
    res <<= 1;
  } while (--len > 0);
  return res >>> 1;
};
const bi_flush = (s) => {
  if (s.bi_valid === 16) {
    put_short(s, s.bi_buf);
    s.bi_buf = 0;
    s.bi_valid = 0;
  } else if (s.bi_valid >= 8) {
    s.pending_buf[s.pending++] = s.bi_buf & 0xff;
    s.bi_buf >>= 8;
    s.bi_valid -= 8;
  }
};
const gen_bitlen = (s, desc) => {
  const tree            = desc.dyn_tree;
  const max_code        = desc.max_code;
  const stree           = desc.stat_desc.static_tree;
  const has_stree       = desc.stat_desc.has_stree;
  const extra           = desc.stat_desc.extra_bits;
  const base            = desc.stat_desc.extra_base;
  const max_length      = desc.stat_desc.max_length;
  let h;
  let n, m;
  let bits;
  let xbits;
  let f;
  let overflow = 0;
  for (bits = 0; bits <= MAX_BITS$1; bits++) {
    s.bl_count[bits] = 0;
  }
  tree[s.heap[s.heap_max] * 2 + 1] = 0;
  for (h = s.heap_max + 1; h < HEAP_SIZE$1; h++) {
    n = s.heap[h];
    bits = tree[tree[n * 2 + 1] * 2 + 1] + 1;
    if (bits > max_length) {
      bits = max_length;
      overflow++;
    }
    tree[n * 2 + 1] = bits;
    if (n > max_code) { continue; }
    s.bl_count[bits]++;
    xbits = 0;
    if (n >= base) {
      xbits = extra[n - base];
    }
    f = tree[n * 2];
    s.opt_len += f * (bits + xbits);
    if (has_stree) {
      s.static_len += f * (stree[n * 2 + 1] + xbits);
    }
  }
  if (overflow === 0) { return; }
  do {
    bits = max_length - 1;
    while (s.bl_count[bits] === 0) { bits--; }
    s.bl_count[bits]--;
    s.bl_count[bits + 1] += 2;
    s.bl_count[max_length]--;
    overflow -= 2;
  } while (overflow > 0);
  for (bits = max_length; bits !== 0; bits--) {
    n = s.bl_count[bits];
    while (n !== 0) {
      m = s.heap[--h];
      if (m > max_code) { continue; }
      if (tree[m * 2 + 1] !== bits) {
        s.opt_len += (bits - tree[m * 2 + 1]) * tree[m * 2];
        tree[m * 2 + 1] = bits;
      }
      n--;
    }
  }
};
const gen_codes = (tree, max_code, bl_count) => {
  const next_code = new Array(MAX_BITS$1 + 1);
  let code = 0;
  let bits;
  let n;
  for (bits = 1; bits <= MAX_BITS$1; bits++) {
    code = (code + bl_count[bits - 1]) << 1;
    next_code[bits] = code;
  }
  for (n = 0;  n <= max_code; n++) {
    let len = tree[n * 2 + 1];
    if (len === 0) { continue; }
    tree[n * 2] = bi_reverse(next_code[len]++, len);
  }
};
const tr_static_init = () => {
  let n;
  let bits;
  let length;
  let code;
  let dist;
  const bl_count = new Array(MAX_BITS$1 + 1);
  length = 0;
  for (code = 0; code < LENGTH_CODES$1 - 1; code++) {
    base_length[code] = length;
    for (n = 0; n < (1 << extra_lbits[code]); n++) {
      _length_code[length++] = code;
    }
  }
  _length_code[length - 1] = code;
  dist = 0;
  for (code = 0; code < 16; code++) {
    base_dist[code] = dist;
    for (n = 0; n < (1 << extra_dbits[code]); n++) {
      _dist_code[dist++] = code;
    }
  }
  dist >>= 7;
  for (; code < D_CODES$1; code++) {
    base_dist[code] = dist << 7;
    for (n = 0; n < (1 << (extra_dbits[code] - 7)); n++) {
      _dist_code[256 + dist++] = code;
    }
  }
  for (bits = 0; bits <= MAX_BITS$1; bits++) {
    bl_count[bits] = 0;
  }
  n = 0;
  while (n <= 143) {
    static_ltree[n * 2 + 1] = 8;
    n++;
    bl_count[8]++;
  }
  while (n <= 255) {
    static_ltree[n * 2 + 1] = 9;
    n++;
    bl_count[9]++;
  }
  while (n <= 279) {
    static_ltree[n * 2 + 1] = 7;
    n++;
    bl_count[7]++;
  }
  while (n <= 287) {
    static_ltree[n * 2 + 1] = 8;
    n++;
    bl_count[8]++;
  }
  gen_codes(static_ltree, L_CODES$1 + 1, bl_count);
  for (n = 0; n < D_CODES$1; n++) {
    static_dtree[n * 2 + 1] = 5;
    static_dtree[n * 2] = bi_reverse(n, 5);
  }
  static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS$1 + 1, L_CODES$1, MAX_BITS$1);
  static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0,          D_CODES$1, MAX_BITS$1);
  static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0,         BL_CODES$1, MAX_BL_BITS);
};
const init_block = (s) => {
  let n;
  for (n = 0; n < L_CODES$1;  n++) { s.dyn_ltree[n * 2] = 0; }
  for (n = 0; n < D_CODES$1;  n++) { s.dyn_dtree[n * 2] = 0; }
  for (n = 0; n < BL_CODES$1; n++) { s.bl_tree[n * 2] = 0; }
  s.dyn_ltree[END_BLOCK * 2] = 1;
  s.opt_len = s.static_len = 0;
  s.sym_next = s.matches = 0;
};
const bi_windup = (s) =>
{
  if (s.bi_valid > 8) {
    put_short(s, s.bi_buf);
  } else if (s.bi_valid > 0) {
    s.pending_buf[s.pending++] = s.bi_buf;
  }
  s.bi_buf = 0;
  s.bi_valid = 0;
};
const smaller = (tree, n, m, depth) => {
  const _n2 = n * 2;
  const _m2 = m * 2;
  return (tree[_n2] < tree[_m2] ||
         (tree[_n2] === tree[_m2] && depth[n] <= depth[m]));
};
const pqdownheap = (s, tree, k) => {
  const v = s.heap[k];
  let j = k << 1;
  while (j <= s.heap_len) {
    if (j < s.heap_len &&
      smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) {
      j++;
    }
    if (smaller(tree, v, s.heap[j], s.depth)) { break; }
    s.heap[k] = s.heap[j];
    k = j;
    j <<= 1;
  }
  s.heap[k] = v;
};
const compress_block = (s, ltree, dtree) => {
  let dist;
  let lc;
  let sx = 0;
  let code;
  let extra;
  if (s.sym_next !== 0) {
    do {
      dist = s.pending_buf[s.sym_buf + sx++] & 0xff;
      dist += (s.pending_buf[s.sym_buf + sx++] & 0xff) << 8;
      lc = s.pending_buf[s.sym_buf + sx++];
      if (dist === 0) {
        send_code(s, lc, ltree);
      } else {
        code = _length_code[lc];
        send_code(s, code + LITERALS$1 + 1, ltree);
        extra = extra_lbits[code];
        if (extra !== 0) {
          lc -= base_length[code];
          send_bits(s, lc, extra);
        }
        dist--;
        code = d_code(dist);
        send_code(s, code, dtree);
        extra = extra_dbits[code];
        if (extra !== 0) {
          dist -= base_dist[code];
          send_bits(s, dist, extra);
        }
      }
    } while (sx < s.sym_next);
  }
  send_code(s, END_BLOCK, ltree);
};
const build_tree = (s, desc) => {
  const tree     = desc.dyn_tree;
  const stree    = desc.stat_desc.static_tree;
  const has_stree = desc.stat_desc.has_stree;
  const elems    = desc.stat_desc.elems;
  let n, m;
  let max_code = -1;
  let node;
  s.heap_len = 0;
  s.heap_max = HEAP_SIZE$1;
  for (n = 0; n < elems; n++) {
    if (tree[n * 2] !== 0) {
      s.heap[++s.heap_len] = max_code = n;
      s.depth[n] = 0;
    } else {
      tree[n * 2 + 1] = 0;
    }
  }
  while (s.heap_len < 2) {
    node = s.heap[++s.heap_len] = (max_code < 2 ? ++max_code : 0);
    tree[node * 2] = 1;
    s.depth[node] = 0;
    s.opt_len--;
    if (has_stree) {
      s.static_len -= stree[node * 2 + 1];
    }
  }
  desc.max_code = max_code;
  for (n = (s.heap_len >> 1); n >= 1; n--) { pqdownheap(s, tree, n); }
  node = elems;
  do {
    n = s.heap[1];
    s.heap[1] = s.heap[s.heap_len--];
    pqdownheap(s, tree, 1);
    m = s.heap[1];
    s.heap[--s.heap_max] = n;
    s.heap[--s.heap_max] = m;
    tree[node * 2] = tree[n * 2] + tree[m * 2];
    s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
    tree[n * 2 + 1] = tree[m * 2 + 1] = node;
    s.heap[1] = node++;
    pqdownheap(s, tree, 1);
  } while (s.heap_len >= 2);
  s.heap[--s.heap_max] = s.heap[1];
  gen_bitlen(s, desc);
  gen_codes(tree, max_code, s.bl_count);
};
const scan_tree = (s, tree, max_code) => {
  let n;
  let prevlen = -1;
  let curlen;
  let nextlen = tree[0 * 2 + 1];
  let count = 0;
  let max_count = 7;
  let min_count = 4;
  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }
  tree[(max_code + 1) * 2 + 1] = 0xffff;
  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n + 1) * 2 + 1];
    if (++count < max_count && curlen === nextlen) {
      continue;
    } else if (count < min_count) {
      s.bl_tree[curlen * 2] += count;
    } else if (curlen !== 0) {
      if (curlen !== prevlen) { s.bl_tree[curlen * 2]++; }
      s.bl_tree[REP_3_6 * 2]++;
    } else if (count <= 10) {
      s.bl_tree[REPZ_3_10 * 2]++;
    } else {
      s.bl_tree[REPZ_11_138 * 2]++;
    }
    count = 0;
    prevlen = curlen;
    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;
    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;
    } else {
      max_count = 7;
      min_count = 4;
    }
  }
};
const send_tree = (s, tree, max_code) => {
  let n;
  let prevlen = -1;
  let curlen;
  let nextlen = tree[0 * 2 + 1];
  let count = 0;
  let max_count = 7;
  let min_count = 4;
  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }
  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n + 1) * 2 + 1];
    if (++count < max_count && curlen === nextlen) {
      continue;
    } else if (count < min_count) {
      do { send_code(s, curlen, s.bl_tree); } while (--count !== 0);
    } else if (curlen !== 0) {
      if (curlen !== prevlen) {
        send_code(s, curlen, s.bl_tree);
        count--;
      }
      send_code(s, REP_3_6, s.bl_tree);
      send_bits(s, count - 3, 2);
    } else if (count <= 10) {
      send_code(s, REPZ_3_10, s.bl_tree);
      send_bits(s, count - 3, 3);
    } else {
      send_code(s, REPZ_11_138, s.bl_tree);
      send_bits(s, count - 11, 7);
    }
    count = 0;
    prevlen = curlen;
    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;
    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;
    } else {
      max_count = 7;
      min_count = 4;
    }
  }
};
const build_bl_tree = (s) => {
  let max_blindex;
  scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
  scan_tree(s, s.dyn_dtree, s.d_desc.max_code);
  build_tree(s, s.bl_desc);
  for (max_blindex = BL_CODES$1 - 1; max_blindex >= 3; max_blindex--) {
    if (s.bl_tree[bl_order[max_blindex] * 2 + 1] !== 0) {
      break;
    }
  }
  s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
  return max_blindex;
};
const send_all_trees = (s, lcodes, dcodes, blcodes) => {
  let rank;
  send_bits(s, lcodes - 257, 5);
  send_bits(s, dcodes - 1,   5);
  send_bits(s, blcodes - 4,  4);
  for (rank = 0; rank < blcodes; rank++) {
    send_bits(s, s.bl_tree[bl_order[rank] * 2 + 1], 3);
  }
  send_tree(s, s.dyn_ltree, lcodes - 1);
  send_tree(s, s.dyn_dtree, dcodes - 1);
};
const detect_data_type = (s) => {
  let block_mask = 0xf3ffc07f;
  let n;
  for (n = 0; n <= 31; n++, block_mask >>>= 1) {
    if ((block_mask & 1) && (s.dyn_ltree[n * 2] !== 0)) {
      return Z_BINARY;
    }
  }
  if (s.dyn_ltree[9 * 2] !== 0 || s.dyn_ltree[10 * 2] !== 0 ||
      s.dyn_ltree[13 * 2] !== 0) {
    return Z_TEXT;
  }
  for (n = 32; n < LITERALS$1; n++) {
    if (s.dyn_ltree[n * 2] !== 0) {
      return Z_TEXT;
    }
  }
  return Z_BINARY;
};
let static_init_done = false;
const _tr_init$1 = (s) =>
{
  if (!static_init_done) {
    tr_static_init();
    static_init_done = true;
  }
  s.l_desc  = new TreeDesc(s.dyn_ltree, static_l_desc);
  s.d_desc  = new TreeDesc(s.dyn_dtree, static_d_desc);
  s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);
  s.bi_buf = 0;
  s.bi_valid = 0;
  init_block(s);
};
const _tr_stored_block$1 = (s, buf, stored_len, last) => {
  send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);
  bi_windup(s);
  put_short(s, stored_len);
  put_short(s, ~stored_len);
  if (stored_len) {
    s.pending_buf.set(s.window.subarray(buf, buf + stored_len), s.pending);
  }
  s.pending += stored_len;
};
const _tr_align$1 = (s) => {
  send_bits(s, STATIC_TREES << 1, 3);
  send_code(s, END_BLOCK, static_ltree);
  bi_flush(s);
};
const _tr_flush_block$1 = (s, buf, stored_len, last) => {
  let opt_lenb, static_lenb;
  let max_blindex = 0;
  if (s.level > 0) {
    if (s.strm.data_type === Z_UNKNOWN$1) {
      s.strm.data_type = detect_data_type(s);
    }
    build_tree(s, s.l_desc);
    build_tree(s, s.d_desc);
    max_blindex = build_bl_tree(s);
    opt_lenb = (s.opt_len + 3 + 7) >>> 3;
    static_lenb = (s.static_len + 3 + 7) >>> 3;
    if (static_lenb <= opt_lenb) { opt_lenb = static_lenb; }
  } else {
    opt_lenb = static_lenb = stored_len + 5;
  }
  if ((stored_len + 4 <= opt_lenb) && (buf !== -1)) {
    _tr_stored_block$1(s, buf, stored_len, last);
  } else if (s.strategy === Z_FIXED$1 || static_lenb === opt_lenb) {
    send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
    compress_block(s, static_ltree, static_dtree);
  } else {
    send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
    send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
    compress_block(s, s.dyn_ltree, s.dyn_dtree);
  }
  init_block(s);
  if (last) {
    bi_windup(s);
  }
};
const _tr_tally$1 = (s, dist, lc) => {
  s.pending_buf[s.sym_buf + s.sym_next++] = dist;
  s.pending_buf[s.sym_buf + s.sym_next++] = dist >> 8;
  s.pending_buf[s.sym_buf + s.sym_next++] = lc;
  if (dist === 0) {
    s.dyn_ltree[lc * 2]++;
  } else {
    s.matches++;
    dist--;
    s.dyn_ltree[(_length_code[lc] + LITERALS$1 + 1) * 2]++;
    s.dyn_dtree[d_code(dist) * 2]++;
  }
  return (s.sym_next === s.sym_end);
};
var _tr_init_1  = _tr_init$1;
var _tr_stored_block_1 = _tr_stored_block$1;
var _tr_flush_block_1  = _tr_flush_block$1;
var _tr_tally_1 = _tr_tally$1;
var _tr_align_1 = _tr_align$1;
var trees = {
	_tr_init: _tr_init_1,
	_tr_stored_block: _tr_stored_block_1,
	_tr_flush_block: _tr_flush_block_1,
	_tr_tally: _tr_tally_1,
	_tr_align: _tr_align_1
};
const adler32 = (adler, buf, len, pos) => {
  let s1 = (adler & 0xffff) |0,
      s2 = ((adler >>> 16) & 0xffff) |0,
      n = 0;
  while (len !== 0) {
    n = len > 2000 ? 2000 : len;
    len -= n;
    do {
      s1 = (s1 + buf[pos++]) |0;
      s2 = (s2 + s1) |0;
    } while (--n);
    s1 %= 65521;
    s2 %= 65521;
  }
  return (s1 | (s2 << 16)) |0;
};
var adler32_1 = adler32;
const makeTable = () => {
  let c, table = [];
  for (var n = 0; n < 256; n++) {
    c = n;
    for (var k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }
  return table;
};
const crcTable = new Uint32Array(makeTable());
const crc32 = (crc, buf, len, pos) => {
  const t = crcTable;
  const end = pos + len;
  crc ^= -1;
  for (let i = pos; i < end; i++) {
    crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1));
};
var crc32_1 = crc32;
var messages = {
  2:      'need dictionary',
  1:      'stream end',
  0:      '',
  '-1':   'file error',
  '-2':   'stream error',
  '-3':   'data error',
  '-4':   'insufficient memory',
  '-5':   'buffer error',
  '-6':   'incompatible version'
};
var constants$2 = {
  Z_NO_FLUSH:         0,
  Z_PARTIAL_FLUSH:    1,
  Z_SYNC_FLUSH:       2,
  Z_FULL_FLUSH:       3,
  Z_FINISH:           4,
  Z_BLOCK:            5,
  Z_TREES:            6,
  Z_OK:               0,
  Z_STREAM_END:       1,
  Z_NEED_DICT:        2,
  Z_ERRNO:           -1,
  Z_STREAM_ERROR:    -2,
  Z_DATA_ERROR:      -3,
  Z_MEM_ERROR:       -4,
  Z_BUF_ERROR:       -5,
  Z_NO_COMPRESSION:         0,
  Z_BEST_SPEED:             1,
  Z_BEST_COMPRESSION:       9,
  Z_DEFAULT_COMPRESSION:   -1,
  Z_FILTERED:               1,
  Z_HUFFMAN_ONLY:           2,
  Z_RLE:                    3,
  Z_FIXED:                  4,
  Z_DEFAULT_STRATEGY:       0,
  Z_BINARY:                 0,
  Z_TEXT:                   1,
  Z_UNKNOWN:                2,
  Z_DEFLATED:               8
};
const { _tr_init, _tr_stored_block, _tr_flush_block, _tr_tally, _tr_align } = trees;
const {
  Z_NO_FLUSH: Z_NO_FLUSH$2, Z_PARTIAL_FLUSH, Z_FULL_FLUSH: Z_FULL_FLUSH$1, Z_FINISH: Z_FINISH$3, Z_BLOCK: Z_BLOCK$1,
  Z_OK: Z_OK$3, Z_STREAM_END: Z_STREAM_END$3, Z_STREAM_ERROR: Z_STREAM_ERROR$2, Z_DATA_ERROR: Z_DATA_ERROR$2, Z_BUF_ERROR: Z_BUF_ERROR$1,
  Z_DEFAULT_COMPRESSION: Z_DEFAULT_COMPRESSION$1,
  Z_FILTERED, Z_HUFFMAN_ONLY, Z_RLE, Z_FIXED, Z_DEFAULT_STRATEGY: Z_DEFAULT_STRATEGY$1,
  Z_UNKNOWN,
  Z_DEFLATED: Z_DEFLATED$2
} = constants$2;
const MAX_MEM_LEVEL = 9;
const MAX_WBITS$1 = 15;
const DEF_MEM_LEVEL = 8;
const LENGTH_CODES  = 29;
const LITERALS      = 256;
const L_CODES       = LITERALS + 1 + LENGTH_CODES;
const D_CODES       = 30;
const BL_CODES      = 19;
const HEAP_SIZE     = 2 * L_CODES + 1;
const MAX_BITS  = 15;
const MIN_MATCH = 3;
const MAX_MATCH = 258;
const MIN_LOOKAHEAD = (MAX_MATCH + MIN_MATCH + 1);
const PRESET_DICT = 0x20;
const INIT_STATE    =  42;
const GZIP_STATE    =  57;
const EXTRA_STATE   =  69;
const NAME_STATE    =  73;
const COMMENT_STATE =  91;
const HCRC_STATE    = 103;
const BUSY_STATE    = 113;
const FINISH_STATE  = 666;
const BS_NEED_MORE      = 1;
const BS_BLOCK_DONE     = 2;
const BS_FINISH_STARTED = 3;
const BS_FINISH_DONE    = 4;
const OS_CODE = 0x03;
const err = (strm, errorCode) => {
  strm.msg = messages[errorCode];
  return errorCode;
};
const rank = (f) => {
  return ((f) * 2) - ((f) > 4 ? 9 : 0);
};
const zero = (buf) => {
  let len = buf.length; while (--len >= 0) { buf[len] = 0; }
};
const slide_hash = (s) => {
  let n, m;
  let p;
  let wsize = s.w_size;
  n = s.hash_size;
  p = n;
  do {
    m = s.head[--p];
    s.head[p] = (m >= wsize ? m - wsize : 0);
  } while (--n);
  n = wsize;
  p = n;
  do {
    m = s.prev[--p];
    s.prev[p] = (m >= wsize ? m - wsize : 0);
  } while (--n);
};
let HASH_ZLIB = (s, prev, data) => ((prev << s.hash_shift) ^ data) & s.hash_mask;
let HASH = HASH_ZLIB;
const flush_pending = (strm) => {
  const s = strm.state;
  let len = s.pending;
  if (len > strm.avail_out) {
    len = strm.avail_out;
  }
  if (len === 0) { return; }
  strm.output.set(s.pending_buf.subarray(s.pending_out, s.pending_out + len), strm.next_out);
  strm.next_out  += len;
  s.pending_out  += len;
  strm.total_out += len;
  strm.avail_out -= len;
  s.pending      -= len;
  if (s.pending === 0) {
    s.pending_out = 0;
  }
};
const flush_block_only = (s, last) => {
  _tr_flush_block(s, (s.block_start >= 0 ? s.block_start : -1), s.strstart - s.block_start, last);
  s.block_start = s.strstart;
  flush_pending(s.strm);
};
const put_byte = (s, b) => {
  s.pending_buf[s.pending++] = b;
};
const putShortMSB = (s, b) => {
  s.pending_buf[s.pending++] = (b >>> 8) & 0xff;
  s.pending_buf[s.pending++] = b & 0xff;
};
const read_buf = (strm, buf, start, size) => {
  let len = strm.avail_in;
  if (len > size) { len = size; }
  if (len === 0) { return 0; }
  strm.avail_in -= len;
  buf.set(strm.input.subarray(strm.next_in, strm.next_in + len), start);
  if (strm.state.wrap === 1) {
    strm.adler = adler32_1(strm.adler, buf, len, start);
  }
  else if (strm.state.wrap === 2) {
    strm.adler = crc32_1(strm.adler, buf, len, start);
  }
  strm.next_in += len;
  strm.total_in += len;
  return len;
};
const longest_match = (s, cur_match) => {
  let chain_length = s.max_chain_length;
  let scan = s.strstart;
  let match;
  let len;
  let best_len = s.prev_length;
  let nice_match = s.nice_match;
  const limit = (s.strstart > (s.w_size - MIN_LOOKAHEAD)) ?
      s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0;
  const _win = s.window;
  const wmask = s.w_mask;
  const prev  = s.prev;
  const strend = s.strstart + MAX_MATCH;
  let scan_end1  = _win[scan + best_len - 1];
  let scan_end   = _win[scan + best_len];
  if (s.prev_length >= s.good_match) {
    chain_length >>= 2;
  }
  if (nice_match > s.lookahead) { nice_match = s.lookahead; }
  do {
    match = cur_match;
    if (_win[match + best_len]     !== scan_end  ||
        _win[match + best_len - 1] !== scan_end1 ||
        _win[match]                !== _win[scan] ||
        _win[++match]              !== _win[scan + 1]) {
      continue;
    }
    scan += 2;
    match++;
    do {
    } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             scan < strend);
    len = MAX_MATCH - (strend - scan);
    scan = strend - MAX_MATCH;
    if (len > best_len) {
      s.match_start = cur_match;
      best_len = len;
      if (len >= nice_match) {
        break;
      }
      scan_end1  = _win[scan + best_len - 1];
      scan_end   = _win[scan + best_len];
    }
  } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);
  if (best_len <= s.lookahead) {
    return best_len;
  }
  return s.lookahead;
};
const fill_window = (s) => {
  const _w_size = s.w_size;
  let n, more, str;
  do {
    more = s.window_size - s.lookahead - s.strstart;
    if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {
      s.window.set(s.window.subarray(_w_size, _w_size + _w_size - more), 0);
      s.match_start -= _w_size;
      s.strstart -= _w_size;
      s.block_start -= _w_size;
      if (s.insert > s.strstart) {
        s.insert = s.strstart;
      }
      slide_hash(s);
      more += _w_size;
    }
    if (s.strm.avail_in === 0) {
      break;
    }
    n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
    s.lookahead += n;
    if (s.lookahead + s.insert >= MIN_MATCH) {
      str = s.strstart - s.insert;
      s.ins_h = s.window[str];
      s.ins_h = HASH(s, s.ins_h, s.window[str + 1]);
      while (s.insert) {
        s.ins_h = HASH(s, s.ins_h, s.window[str + MIN_MATCH - 1]);
        s.prev[str & s.w_mask] = s.head[s.ins_h];
        s.head[s.ins_h] = str;
        str++;
        s.insert--;
        if (s.lookahead + s.insert < MIN_MATCH) {
          break;
        }
      }
    }
  } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);
};
const deflate_stored = (s, flush) => {
  let min_block = s.pending_buf_size - 5 > s.w_size ? s.w_size : s.pending_buf_size - 5;
  let len, left, have, last = 0;
  let used = s.strm.avail_in;
  do {
    len = 65535;
    have = (s.bi_valid + 42) >> 3;
    if (s.strm.avail_out < have) {
      break;
    }
    have = s.strm.avail_out - have;
    left = s.strstart - s.block_start;
    if (len > left + s.strm.avail_in) {
      len = left + s.strm.avail_in;
    }
    if (len > have) {
      len = have;
    }
    if (len < min_block && ((len === 0 && flush !== Z_FINISH$3) ||
                        flush === Z_NO_FLUSH$2 ||
                        len !== left + s.strm.avail_in)) {
      break;
    }
    last = flush === Z_FINISH$3 && len === left + s.strm.avail_in ? 1 : 0;
    _tr_stored_block(s, 0, 0, last);
    s.pending_buf[s.pending - 4] = len;
    s.pending_buf[s.pending - 3] = len >> 8;
    s.pending_buf[s.pending - 2] = ~len;
    s.pending_buf[s.pending - 1] = ~len >> 8;
    flush_pending(s.strm);
    if (left) {
      if (left > len) {
        left = len;
      }
      s.strm.output.set(s.window.subarray(s.block_start, s.block_start + left), s.strm.next_out);
      s.strm.next_out += left;
      s.strm.avail_out -= left;
      s.strm.total_out += left;
      s.block_start += left;
      len -= left;
    }
    if (len) {
      read_buf(s.strm, s.strm.output, s.strm.next_out, len);
      s.strm.next_out += len;
      s.strm.avail_out -= len;
      s.strm.total_out += len;
    }
  } while (last === 0);
  used -= s.strm.avail_in;
  if (used) {
    if (used >= s.w_size) {
      s.matches = 2;
      s.window.set(s.strm.input.subarray(s.strm.next_in - s.w_size, s.strm.next_in), 0);
      s.strstart = s.w_size;
      s.insert = s.strstart;
    }
    else {
      if (s.window_size - s.strstart <= used) {
        s.strstart -= s.w_size;
        s.window.set(s.window.subarray(s.w_size, s.w_size + s.strstart), 0);
        if (s.matches < 2) {
          s.matches++;
        }
        if (s.insert > s.strstart) {
          s.insert = s.strstart;
        }
      }
      s.window.set(s.strm.input.subarray(s.strm.next_in - used, s.strm.next_in), s.strstart);
      s.strstart += used;
      s.insert += used > s.w_size - s.insert ? s.w_size - s.insert : used;
    }
    s.block_start = s.strstart;
  }
  if (s.high_water < s.strstart) {
    s.high_water = s.strstart;
  }
  if (last) {
    return BS_FINISH_DONE;
  }
  if (flush !== Z_NO_FLUSH$2 && flush !== Z_FINISH$3 &&
    s.strm.avail_in === 0 && s.strstart === s.block_start) {
    return BS_BLOCK_DONE;
  }
  have = s.window_size - s.strstart;
  if (s.strm.avail_in > have && s.block_start >= s.w_size) {
    s.block_start -= s.w_size;
    s.strstart -= s.w_size;
    s.window.set(s.window.subarray(s.w_size, s.w_size + s.strstart), 0);
    if (s.matches < 2) {
      s.matches++;
    }
    have += s.w_size;
    if (s.insert > s.strstart) {
      s.insert = s.strstart;
    }
  }
  if (have > s.strm.avail_in) {
    have = s.strm.avail_in;
  }
  if (have) {
    read_buf(s.strm, s.window, s.strstart, have);
    s.strstart += have;
    s.insert += have > s.w_size - s.insert ? s.w_size - s.insert : have;
  }
  if (s.high_water < s.strstart) {
    s.high_water = s.strstart;
  }
  have = (s.bi_valid + 42) >> 3;
  have = s.pending_buf_size - have > 65535 ? 65535 : s.pending_buf_size - have;
  min_block = have > s.w_size ? s.w_size : have;
  left = s.strstart - s.block_start;
  if (left >= min_block ||
     ((left || flush === Z_FINISH$3) && flush !== Z_NO_FLUSH$2 &&
     s.strm.avail_in === 0 && left <= have)) {
    len = left > have ? have : left;
    last = flush === Z_FINISH$3 && s.strm.avail_in === 0 &&
         len === left ? 1 : 0;
    _tr_stored_block(s, s.block_start, len, last);
    s.block_start += len;
    flush_pending(s.strm);
  }
  return last ? BS_FINISH_STARTED : BS_NEED_MORE;
};
const deflate_fast = (s, flush) => {
  let hash_head;
  let bflush;
  for (;;) {
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH$2) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) {
        break;
      }
    }
    hash_head = 0;
    if (s.lookahead >= MIN_MATCH) {
      s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
    }
    if (hash_head !== 0 && ((s.strstart - hash_head) <= (s.w_size - MIN_LOOKAHEAD))) {
      s.match_length = longest_match(s, hash_head);
    }
    if (s.match_length >= MIN_MATCH) {
      bflush = _tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);
      s.lookahead -= s.match_length;
      if (s.match_length <= s.max_lazy_match && s.lookahead >= MIN_MATCH) {
        s.match_length--;
        do {
          s.strstart++;
          s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
        } while (--s.match_length !== 0);
        s.strstart++;
      } else
      {
        s.strstart += s.match_length;
        s.match_length = 0;
        s.ins_h = s.window[s.strstart];
        s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + 1]);
      }
    } else {
      bflush = _tr_tally(s, 0, s.window[s.strstart]);
      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
  }
  s.insert = ((s.strstart < (MIN_MATCH - 1)) ? s.strstart : MIN_MATCH - 1);
  if (flush === Z_FINISH$3) {
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    return BS_FINISH_DONE;
  }
  if (s.sym_next) {
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
  }
  return BS_BLOCK_DONE;
};
const deflate_slow = (s, flush) => {
  let hash_head;
  let bflush;
  let max_insert;
  for (;;) {
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH$2) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) { break; }
    }
    hash_head = 0;
    if (s.lookahead >= MIN_MATCH) {
      s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
    }
    s.prev_length = s.match_length;
    s.prev_match = s.match_start;
    s.match_length = MIN_MATCH - 1;
    if (hash_head !== 0 && s.prev_length < s.max_lazy_match &&
        s.strstart - hash_head <= (s.w_size - MIN_LOOKAHEAD)) {
      s.match_length = longest_match(s, hash_head);
      if (s.match_length <= 5 &&
         (s.strategy === Z_FILTERED || (s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096))) {
        s.match_length = MIN_MATCH - 1;
      }
    }
    if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
      max_insert = s.strstart + s.lookahead - MIN_MATCH;
      bflush = _tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH);
      s.lookahead -= s.prev_length - 1;
      s.prev_length -= 2;
      do {
        if (++s.strstart <= max_insert) {
          s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
        }
      } while (--s.prev_length !== 0);
      s.match_available = 0;
      s.match_length = MIN_MATCH - 1;
      s.strstart++;
      if (bflush) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
    } else if (s.match_available) {
      bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
      if (bflush) {
        flush_block_only(s, false);
      }
      s.strstart++;
      s.lookahead--;
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    } else {
      s.match_available = 1;
      s.strstart++;
      s.lookahead--;
    }
  }
  if (s.match_available) {
    bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
    s.match_available = 0;
  }
  s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
  if (flush === Z_FINISH$3) {
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    return BS_FINISH_DONE;
  }
  if (s.sym_next) {
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
  }
  return BS_BLOCK_DONE;
};
const deflate_rle = (s, flush) => {
  let bflush;
  let prev;
  let scan, strend;
  const _win = s.window;
  for (;;) {
    if (s.lookahead <= MAX_MATCH) {
      fill_window(s);
      if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH$2) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) { break; }
    }
    s.match_length = 0;
    if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
      scan = s.strstart - 1;
      prev = _win[scan];
      if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
        strend = s.strstart + MAX_MATCH;
        do {
        } while (prev === _win[++scan] && prev === _win[++scan] &&
                 prev === _win[++scan] && prev === _win[++scan] &&
                 prev === _win[++scan] && prev === _win[++scan] &&
                 prev === _win[++scan] && prev === _win[++scan] &&
                 scan < strend);
        s.match_length = MAX_MATCH - (strend - scan);
        if (s.match_length > s.lookahead) {
          s.match_length = s.lookahead;
        }
      }
    }
    if (s.match_length >= MIN_MATCH) {
      bflush = _tr_tally(s, 1, s.match_length - MIN_MATCH);
      s.lookahead -= s.match_length;
      s.strstart += s.match_length;
      s.match_length = 0;
    } else {
      bflush = _tr_tally(s, 0, s.window[s.strstart]);
      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
  }
  s.insert = 0;
  if (flush === Z_FINISH$3) {
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    return BS_FINISH_DONE;
  }
  if (s.sym_next) {
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
  }
  return BS_BLOCK_DONE;
};
const deflate_huff = (s, flush) => {
  let bflush;
  for (;;) {
    if (s.lookahead === 0) {
      fill_window(s);
      if (s.lookahead === 0) {
        if (flush === Z_NO_FLUSH$2) {
          return BS_NEED_MORE;
        }
        break;
      }
    }
    s.match_length = 0;
    bflush = _tr_tally(s, 0, s.window[s.strstart]);
    s.lookahead--;
    s.strstart++;
    if (bflush) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
  }
  s.insert = 0;
  if (flush === Z_FINISH$3) {
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    return BS_FINISH_DONE;
  }
  if (s.sym_next) {
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
  }
  return BS_BLOCK_DONE;
};
function Config(good_length, max_lazy, nice_length, max_chain, func) {
  this.good_length = good_length;
  this.max_lazy = max_lazy;
  this.nice_length = nice_length;
  this.max_chain = max_chain;
  this.func = func;
}
const configuration_table = [
  new Config(0, 0, 0, 0, deflate_stored),
  new Config(4, 4, 8, 4, deflate_fast),
  new Config(4, 5, 16, 8, deflate_fast),
  new Config(4, 6, 32, 32, deflate_fast),
  new Config(4, 4, 16, 16, deflate_slow),
  new Config(8, 16, 32, 32, deflate_slow),
  new Config(8, 16, 128, 128, deflate_slow),
  new Config(8, 32, 128, 256, deflate_slow),
  new Config(32, 128, 258, 1024, deflate_slow),
  new Config(32, 258, 258, 4096, deflate_slow)
];
const lm_init = (s) => {
  s.window_size = 2 * s.w_size;
  zero(s.head);
  s.max_lazy_match = configuration_table[s.level].max_lazy;
  s.good_match = configuration_table[s.level].good_length;
  s.nice_match = configuration_table[s.level].nice_length;
  s.max_chain_length = configuration_table[s.level].max_chain;
  s.strstart = 0;
  s.block_start = 0;
  s.lookahead = 0;
  s.insert = 0;
  s.match_length = s.prev_length = MIN_MATCH - 1;
  s.match_available = 0;
  s.ins_h = 0;
};
function DeflateState() {
  this.strm = null;
  this.status = 0;
  this.pending_buf = null;
  this.pending_buf_size = 0;
  this.pending_out = 0;
  this.pending = 0;
  this.wrap = 0;
  this.gzhead = null;
  this.gzindex = 0;
  this.method = Z_DEFLATED$2;
  this.last_flush = -1;
  this.w_size = 0;
  this.w_bits = 0;
  this.w_mask = 0;
  this.window = null;
  this.window_size = 0;
  this.prev = null;
  this.head = null;
  this.ins_h = 0;
  this.hash_size = 0;
  this.hash_bits = 0;
  this.hash_mask = 0;
  this.hash_shift = 0;
  this.block_start = 0;
  this.match_length = 0;
  this.prev_match = 0;
  this.match_available = 0;
  this.strstart = 0;
  this.match_start = 0;
  this.lookahead = 0;
  this.prev_length = 0;
  this.max_chain_length = 0;
  this.max_lazy_match = 0;
  this.level = 0;
  this.strategy = 0;
  this.good_match = 0;
  this.nice_match = 0;
  this.dyn_ltree  = new Uint16Array(HEAP_SIZE * 2);
  this.dyn_dtree  = new Uint16Array((2 * D_CODES + 1) * 2);
  this.bl_tree    = new Uint16Array((2 * BL_CODES + 1) * 2);
  zero(this.dyn_ltree);
  zero(this.dyn_dtree);
  zero(this.bl_tree);
  this.l_desc   = null;
  this.d_desc   = null;
  this.bl_desc  = null;
  this.bl_count = new Uint16Array(MAX_BITS + 1);
  this.heap = new Uint16Array(2 * L_CODES + 1);
  zero(this.heap);
  this.heap_len = 0;
  this.heap_max = 0;
  this.depth = new Uint16Array(2 * L_CODES + 1);
  zero(this.depth);
  this.sym_buf = 0;
  this.lit_bufsize = 0;
  this.sym_next = 0;
  this.sym_end = 0;
  this.opt_len = 0;
  this.static_len = 0;
  this.matches = 0;
  this.insert = 0;
  this.bi_buf = 0;
  this.bi_valid = 0;
}
const deflateStateCheck = (strm) => {
  if (!strm) {
    return 1;
  }
  const s = strm.state;
  if (!s || s.strm !== strm || (s.status !== INIT_STATE &&
                                s.status !== GZIP_STATE &&
                                s.status !== EXTRA_STATE &&
                                s.status !== NAME_STATE &&
                                s.status !== COMMENT_STATE &&
                                s.status !== HCRC_STATE &&
                                s.status !== BUSY_STATE &&
                                s.status !== FINISH_STATE)) {
    return 1;
  }
  return 0;
};
const deflateResetKeep = (strm) => {
  if (deflateStateCheck(strm)) {
    return err(strm, Z_STREAM_ERROR$2);
  }
  strm.total_in = strm.total_out = 0;
  strm.data_type = Z_UNKNOWN;
  const s = strm.state;
  s.pending = 0;
  s.pending_out = 0;
  if (s.wrap < 0) {
    s.wrap = -s.wrap;
  }
  s.status =
    s.wrap === 2 ? GZIP_STATE :
    s.wrap ? INIT_STATE : BUSY_STATE;
  strm.adler = (s.wrap === 2) ?
    0
  :
    1;
  s.last_flush = -2;
  _tr_init(s);
  return Z_OK$3;
};
const deflateReset = (strm) => {
  const ret = deflateResetKeep(strm);
  if (ret === Z_OK$3) {
    lm_init(strm.state);
  }
  return ret;
};
const deflateSetHeader = (strm, head) => {
  if (deflateStateCheck(strm) || strm.state.wrap !== 2) {
    return Z_STREAM_ERROR$2;
  }
  strm.state.gzhead = head;
  return Z_OK$3;
};
const deflateInit2 = (strm, level, method, windowBits, memLevel, strategy) => {
  if (!strm) {
    return Z_STREAM_ERROR$2;
  }
  let wrap = 1;
  if (level === Z_DEFAULT_COMPRESSION$1) {
    level = 6;
  }
  if (windowBits < 0) {
    wrap = 0;
    windowBits = -windowBits;
  }
  else if (windowBits > 15) {
    wrap = 2;
    windowBits -= 16;
  }
  if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED$2 ||
    windowBits < 8 || windowBits > 15 || level < 0 || level > 9 ||
    strategy < 0 || strategy > Z_FIXED || (windowBits === 8 && wrap !== 1)) {
    return err(strm, Z_STREAM_ERROR$2);
  }
  if (windowBits === 8) {
    windowBits = 9;
  }
  const s = new DeflateState();
  strm.state = s;
  s.strm = strm;
  s.status = INIT_STATE;
  s.wrap = wrap;
  s.gzhead = null;
  s.w_bits = windowBits;
  s.w_size = 1 << s.w_bits;
  s.w_mask = s.w_size - 1;
  s.hash_bits = memLevel + 7;
  s.hash_size = 1 << s.hash_bits;
  s.hash_mask = s.hash_size - 1;
  s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);
  s.window = new Uint8Array(s.w_size * 2);
  s.head = new Uint16Array(s.hash_size);
  s.prev = new Uint16Array(s.w_size);
  s.lit_bufsize = 1 << (memLevel + 6);
  s.pending_buf_size = s.lit_bufsize * 4;
  s.pending_buf = new Uint8Array(s.pending_buf_size);
  s.sym_buf = s.lit_bufsize;
  s.sym_end = (s.lit_bufsize - 1) * 3;
  s.level = level;
  s.strategy = strategy;
  s.method = method;
  return deflateReset(strm);
};
const deflateInit = (strm, level) => {
  return deflateInit2(strm, level, Z_DEFLATED$2, MAX_WBITS$1, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY$1);
};
const deflate$2 = (strm, flush) => {
  if (deflateStateCheck(strm) || flush > Z_BLOCK$1 || flush < 0) {
    return strm ? err(strm, Z_STREAM_ERROR$2) : Z_STREAM_ERROR$2;
  }
  const s = strm.state;
  if (!strm.output ||
      (strm.avail_in !== 0 && !strm.input) ||
      (s.status === FINISH_STATE && flush !== Z_FINISH$3)) {
    return err(strm, (strm.avail_out === 0) ? Z_BUF_ERROR$1 : Z_STREAM_ERROR$2);
  }
  const old_flush = s.last_flush;
  s.last_flush = flush;
  if (s.pending !== 0) {
    flush_pending(strm);
    if (strm.avail_out === 0) {
      s.last_flush = -1;
      return Z_OK$3;
    }
  } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) &&
    flush !== Z_FINISH$3) {
    return err(strm, Z_BUF_ERROR$1);
  }
  if (s.status === FINISH_STATE && strm.avail_in !== 0) {
    return err(strm, Z_BUF_ERROR$1);
  }
  if (s.status === INIT_STATE && s.wrap === 0) {
    s.status = BUSY_STATE;
  }
  if (s.status === INIT_STATE) {
    let header = (Z_DEFLATED$2 + ((s.w_bits - 8) << 4)) << 8;
    let level_flags = -1;
    if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
      level_flags = 0;
    } else if (s.level < 6) {
      level_flags = 1;
    } else if (s.level === 6) {
      level_flags = 2;
    } else {
      level_flags = 3;
    }
    header |= (level_flags << 6);
    if (s.strstart !== 0) { header |= PRESET_DICT; }
    header += 31 - (header % 31);
    putShortMSB(s, header);
    if (s.strstart !== 0) {
      putShortMSB(s, strm.adler >>> 16);
      putShortMSB(s, strm.adler & 0xffff);
    }
    strm.adler = 1;
    s.status = BUSY_STATE;
    flush_pending(strm);
    if (s.pending !== 0) {
      s.last_flush = -1;
      return Z_OK$3;
    }
  }
  if (s.status === GZIP_STATE) {
    strm.adler = 0;
    put_byte(s, 31);
    put_byte(s, 139);
    put_byte(s, 8);
    if (!s.gzhead) {
      put_byte(s, 0);
      put_byte(s, 0);
      put_byte(s, 0);
      put_byte(s, 0);
      put_byte(s, 0);
      put_byte(s, s.level === 9 ? 2 :
                  (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
                   4 : 0));
      put_byte(s, OS_CODE);
      s.status = BUSY_STATE;
      flush_pending(strm);
      if (s.pending !== 0) {
        s.last_flush = -1;
        return Z_OK$3;
      }
    }
    else {
      put_byte(s, (s.gzhead.text ? 1 : 0) +
                  (s.gzhead.hcrc ? 2 : 0) +
                  (!s.gzhead.extra ? 0 : 4) +
                  (!s.gzhead.name ? 0 : 8) +
                  (!s.gzhead.comment ? 0 : 16)
      );
      put_byte(s, s.gzhead.time & 0xff);
      put_byte(s, (s.gzhead.time >> 8) & 0xff);
      put_byte(s, (s.gzhead.time >> 16) & 0xff);
      put_byte(s, (s.gzhead.time >> 24) & 0xff);
      put_byte(s, s.level === 9 ? 2 :
                  (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
                   4 : 0));
      put_byte(s, s.gzhead.os & 0xff);
      if (s.gzhead.extra && s.gzhead.extra.length) {
        put_byte(s, s.gzhead.extra.length & 0xff);
        put_byte(s, (s.gzhead.extra.length >> 8) & 0xff);
      }
      if (s.gzhead.hcrc) {
        strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending, 0);
      }
      s.gzindex = 0;
      s.status = EXTRA_STATE;
    }
  }
  if (s.status === EXTRA_STATE) {
    if (s.gzhead.extra) {
      let beg = s.pending;
      let left = (s.gzhead.extra.length & 0xffff) - s.gzindex;
      while (s.pending + left > s.pending_buf_size) {
        let copy = s.pending_buf_size - s.pending;
        s.pending_buf.set(s.gzhead.extra.subarray(s.gzindex, s.gzindex + copy), s.pending);
        s.pending = s.pending_buf_size;
        if (s.gzhead.hcrc && s.pending > beg) {
          strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
        }
        s.gzindex += copy;
        flush_pending(strm);
        if (s.pending !== 0) {
          s.last_flush = -1;
          return Z_OK$3;
        }
        beg = 0;
        left -= copy;
      }
      let gzhead_extra = new Uint8Array(s.gzhead.extra);
      s.pending_buf.set(gzhead_extra.subarray(s.gzindex, s.gzindex + left), s.pending);
      s.pending += left;
      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      s.gzindex = 0;
    }
    s.status = NAME_STATE;
  }
  if (s.status === NAME_STATE) {
    if (s.gzhead.name) {
      let beg = s.pending;
      let val;
      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          if (s.pending !== 0) {
            s.last_flush = -1;
            return Z_OK$3;
          }
          beg = 0;
        }
        if (s.gzindex < s.gzhead.name.length) {
          val = s.gzhead.name.charCodeAt(s.gzindex++) & 0xff;
        } else {
          val = 0;
        }
        put_byte(s, val);
      } while (val !== 0);
      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      s.gzindex = 0;
    }
    s.status = COMMENT_STATE;
  }
  if (s.status === COMMENT_STATE) {
    if (s.gzhead.comment) {
      let beg = s.pending;
      let val;
      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          if (s.pending !== 0) {
            s.last_flush = -1;
            return Z_OK$3;
          }
          beg = 0;
        }
        if (s.gzindex < s.gzhead.comment.length) {
          val = s.gzhead.comment.charCodeAt(s.gzindex++) & 0xff;
        } else {
          val = 0;
        }
        put_byte(s, val);
      } while (val !== 0);
      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
    }
    s.status = HCRC_STATE;
  }
  if (s.status === HCRC_STATE) {
    if (s.gzhead.hcrc) {
      if (s.pending + 2 > s.pending_buf_size) {
        flush_pending(strm);
        if (s.pending !== 0) {
          s.last_flush = -1;
          return Z_OK$3;
        }
      }
      put_byte(s, strm.adler & 0xff);
      put_byte(s, (strm.adler >> 8) & 0xff);
      strm.adler = 0;
    }
    s.status = BUSY_STATE;
    flush_pending(strm);
    if (s.pending !== 0) {
      s.last_flush = -1;
      return Z_OK$3;
    }
  }
  if (strm.avail_in !== 0 || s.lookahead !== 0 ||
    (flush !== Z_NO_FLUSH$2 && s.status !== FINISH_STATE)) {
    let bstate = s.level === 0 ? deflate_stored(s, flush) :
                 s.strategy === Z_HUFFMAN_ONLY ? deflate_huff(s, flush) :
                 s.strategy === Z_RLE ? deflate_rle(s, flush) :
                 configuration_table[s.level].func(s, flush);
    if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
      s.status = FINISH_STATE;
    }
    if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
      if (strm.avail_out === 0) {
        s.last_flush = -1;
      }
      return Z_OK$3;
    }
    if (bstate === BS_BLOCK_DONE) {
      if (flush === Z_PARTIAL_FLUSH) {
        _tr_align(s);
      }
      else if (flush !== Z_BLOCK$1) {
        _tr_stored_block(s, 0, 0, false);
        if (flush === Z_FULL_FLUSH$1) {
          zero(s.head);
          if (s.lookahead === 0) {
            s.strstart = 0;
            s.block_start = 0;
            s.insert = 0;
          }
        }
      }
      flush_pending(strm);
      if (strm.avail_out === 0) {
        s.last_flush = -1;
        return Z_OK$3;
      }
    }
  }
  if (flush !== Z_FINISH$3) { return Z_OK$3; }
  if (s.wrap <= 0) { return Z_STREAM_END$3; }
  if (s.wrap === 2) {
    put_byte(s, strm.adler & 0xff);
    put_byte(s, (strm.adler >> 8) & 0xff);
    put_byte(s, (strm.adler >> 16) & 0xff);
    put_byte(s, (strm.adler >> 24) & 0xff);
    put_byte(s, strm.total_in & 0xff);
    put_byte(s, (strm.total_in >> 8) & 0xff);
    put_byte(s, (strm.total_in >> 16) & 0xff);
    put_byte(s, (strm.total_in >> 24) & 0xff);
  }
  else
  {
    putShortMSB(s, strm.adler >>> 16);
    putShortMSB(s, strm.adler & 0xffff);
  }
  flush_pending(strm);
  if (s.wrap > 0) { s.wrap = -s.wrap; }
  return s.pending !== 0 ? Z_OK$3 : Z_STREAM_END$3;
};
const deflateEnd = (strm) => {
  if (deflateStateCheck(strm)) {
    return Z_STREAM_ERROR$2;
  }
  const status = strm.state.status;
  strm.state = null;
  return status === BUSY_STATE ? err(strm, Z_DATA_ERROR$2) : Z_OK$3;
};
const deflateSetDictionary = (strm, dictionary) => {
  let dictLength = dictionary.length;
  if (deflateStateCheck(strm)) {
    return Z_STREAM_ERROR$2;
  }
  const s = strm.state;
  const wrap = s.wrap;
  if (wrap === 2 || (wrap === 1 && s.status !== INIT_STATE) || s.lookahead) {
    return Z_STREAM_ERROR$2;
  }
  if (wrap === 1) {
    strm.adler = adler32_1(strm.adler, dictionary, dictLength, 0);
  }
  s.wrap = 0;
  if (dictLength >= s.w_size) {
    if (wrap === 0) {
      zero(s.head);
      s.strstart = 0;
      s.block_start = 0;
      s.insert = 0;
    }
    let tmpDict = new Uint8Array(s.w_size);
    tmpDict.set(dictionary.subarray(dictLength - s.w_size, dictLength), 0);
    dictionary = tmpDict;
    dictLength = s.w_size;
  }
  const avail = strm.avail_in;
  const next = strm.next_in;
  const input = strm.input;
  strm.avail_in = dictLength;
  strm.next_in = 0;
  strm.input = dictionary;
  fill_window(s);
  while (s.lookahead >= MIN_MATCH) {
    let str = s.strstart;
    let n = s.lookahead - (MIN_MATCH - 1);
    do {
      s.ins_h = HASH(s, s.ins_h, s.window[str + MIN_MATCH - 1]);
      s.prev[str & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = str;
      str++;
    } while (--n);
    s.strstart = str;
    s.lookahead = MIN_MATCH - 1;
    fill_window(s);
  }
  s.strstart += s.lookahead;
  s.block_start = s.strstart;
  s.insert = s.lookahead;
  s.lookahead = 0;
  s.match_length = s.prev_length = MIN_MATCH - 1;
  s.match_available = 0;
  strm.next_in = next;
  strm.input = input;
  strm.avail_in = avail;
  s.wrap = wrap;
  return Z_OK$3;
};
var deflateInit_1 = deflateInit;
var deflateInit2_1 = deflateInit2;
var deflateReset_1 = deflateReset;
var deflateResetKeep_1 = deflateResetKeep;
var deflateSetHeader_1 = deflateSetHeader;
var deflate_2$1 = deflate$2;
var deflateEnd_1 = deflateEnd;
var deflateSetDictionary_1 = deflateSetDictionary;
var deflateInfo = 'pako deflate (from Nodeca project)';
var deflate_1$2 = {
	deflateInit: deflateInit_1,
	deflateInit2: deflateInit2_1,
	deflateReset: deflateReset_1,
	deflateResetKeep: deflateResetKeep_1,
	deflateSetHeader: deflateSetHeader_1,
	deflate: deflate_2$1,
	deflateEnd: deflateEnd_1,
	deflateSetDictionary: deflateSetDictionary_1,
	deflateInfo: deflateInfo
};
const _has = (obj, key) => {
  return Object.prototype.hasOwnProperty.call(obj, key);
};
var assign = function (obj ) {
  const sources = Array.prototype.slice.call(arguments, 1);
  while (sources.length) {
    const source = sources.shift();
    if (!source) { continue; }
    if (typeof source !== 'object') {
      throw new TypeError(source + 'must be non-object');
    }
    for (const p in source) {
      if (_has(source, p)) {
        obj[p] = source[p];
      }
    }
  }
  return obj;
};
var flattenChunks = (chunks) => {
  let len = 0;
  for (let i = 0, l = chunks.length; i < l; i++) {
    len += chunks[i].length;
  }
  const result = new Uint8Array(len);
  for (let i = 0, pos = 0, l = chunks.length; i < l; i++) {
    let chunk = chunks[i];
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
};
var common = {
	assign: assign,
	flattenChunks: flattenChunks
};
let STR_APPLY_UIA_OK = true;
try { String.fromCharCode.apply(null, new Uint8Array(1)); } catch (__) { STR_APPLY_UIA_OK = false; }
const _utf8len = new Uint8Array(256);
for (let q = 0; q < 256; q++) {
  _utf8len[q] = (q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1);
}
_utf8len[254] = _utf8len[254] = 1;
var string2buf = (str) => {
  if (typeof TextEncoder === 'function' && TextEncoder.prototype.encode) {
    return new TextEncoder().encode(str);
  }
  let buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;
  for (m_pos = 0; m_pos < str_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 0xfc00) === 0xd800 && (m_pos + 1 < str_len)) {
      c2 = str.charCodeAt(m_pos + 1);
      if ((c2 & 0xfc00) === 0xdc00) {
        c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        m_pos++;
      }
    }
    buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  buf = new Uint8Array(buf_len);
  for (i = 0, m_pos = 0; i < buf_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 0xfc00) === 0xd800 && (m_pos + 1 < str_len)) {
      c2 = str.charCodeAt(m_pos + 1);
      if ((c2 & 0xfc00) === 0xdc00) {
        c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        m_pos++;
      }
    }
    if (c < 0x80) {
      buf[i++] = c;
    } else if (c < 0x800) {
      buf[i++] = 0xC0 | (c >>> 6);
      buf[i++] = 0x80 | (c & 0x3f);
    } else if (c < 0x10000) {
      buf[i++] = 0xE0 | (c >>> 12);
      buf[i++] = 0x80 | (c >>> 6 & 0x3f);
      buf[i++] = 0x80 | (c & 0x3f);
    } else {
      buf[i++] = 0xf0 | (c >>> 18);
      buf[i++] = 0x80 | (c >>> 12 & 0x3f);
      buf[i++] = 0x80 | (c >>> 6 & 0x3f);
      buf[i++] = 0x80 | (c & 0x3f);
    }
  }
  return buf;
};
const buf2binstring = (buf, len) => {
  if (len < 65534) {
    if (buf.subarray && STR_APPLY_UIA_OK) {
      return String.fromCharCode.apply(null, buf.length === len ? buf : buf.subarray(0, len));
    }
  }
  let result = '';
  for (let i = 0; i < len; i++) {
    result += String.fromCharCode(buf[i]);
  }
  return result;
};
var buf2string = (buf, max) => {
  const len = max || buf.length;
  if (typeof TextDecoder === 'function' && TextDecoder.prototype.decode) {
    return new TextDecoder().decode(buf.subarray(0, max));
  }
  let i, out;
  const utf16buf = new Array(len * 2);
  for (out = 0, i = 0; i < len;) {
    let c = buf[i++];
    if (c < 0x80) { utf16buf[out++] = c; continue; }
    let c_len = _utf8len[c];
    if (c_len > 4) { utf16buf[out++] = 0xfffd; i += c_len - 1; continue; }
    c &= c_len === 2 ? 0x1f : c_len === 3 ? 0x0f : 0x07;
    while (c_len > 1 && i < len) {
      c = (c << 6) | (buf[i++] & 0x3f);
      c_len--;
    }
    if (c_len > 1) { utf16buf[out++] = 0xfffd; continue; }
    if (c < 0x10000) {
      utf16buf[out++] = c;
    } else {
      c -= 0x10000;
      utf16buf[out++] = 0xd800 | ((c >> 10) & 0x3ff);
      utf16buf[out++] = 0xdc00 | (c & 0x3ff);
    }
  }
  return buf2binstring(utf16buf, out);
};
var utf8border = (buf, max) => {
  max = max || buf.length;
  if (max > buf.length) { max = buf.length; }
  let pos = max - 1;
  while (pos >= 0 && (buf[pos] & 0xC0) === 0x80) { pos--; }
  if (pos < 0) { return max; }
  if (pos === 0) { return max; }
  return (pos + _utf8len[buf[pos]] > max) ? pos : max;
};
var strings = {
	string2buf: string2buf,
	buf2string: buf2string,
	utf8border: utf8border
};
function ZStream() {
  this.input = null;
  this.next_in = 0;
  this.avail_in = 0;
  this.total_in = 0;
  this.output = null;
  this.next_out = 0;
  this.avail_out = 0;
  this.total_out = 0;
  this.msg = '';
  this.state = null;
  this.data_type = 2;
  this.adler = 0;
}
var zstream = ZStream;
const toString$1 = Object.prototype.toString;
const {
  Z_NO_FLUSH: Z_NO_FLUSH$1, Z_SYNC_FLUSH, Z_FULL_FLUSH, Z_FINISH: Z_FINISH$2,
  Z_OK: Z_OK$2, Z_STREAM_END: Z_STREAM_END$2,
  Z_DEFAULT_COMPRESSION,
  Z_DEFAULT_STRATEGY,
  Z_DEFLATED: Z_DEFLATED$1
} = constants$2;
function Deflate$1(options) {
  this.options = common.assign({
    level: Z_DEFAULT_COMPRESSION,
    method: Z_DEFLATED$1,
    chunkSize: 16384,
    windowBits: 15,
    memLevel: 8,
    strategy: Z_DEFAULT_STRATEGY
  }, options || {});
  let opt = this.options;
  if (opt.raw && (opt.windowBits > 0)) {
    opt.windowBits = -opt.windowBits;
  }
  else if (opt.gzip && (opt.windowBits > 0) && (opt.windowBits < 16)) {
    opt.windowBits += 16;
  }
  this.err    = 0;
  this.msg    = '';
  this.ended  = false;
  this.chunks = [];
  this.strm = new zstream();
  this.strm.avail_out = 0;
  let status = deflate_1$2.deflateInit2(
    this.strm,
    opt.level,
    opt.method,
    opt.windowBits,
    opt.memLevel,
    opt.strategy
  );
  if (status !== Z_OK$2) {
    throw new Error(messages[status]);
  }
  if (opt.header) {
    deflate_1$2.deflateSetHeader(this.strm, opt.header);
  }
  if (opt.dictionary) {
    let dict;
    if (typeof opt.dictionary === 'string') {
      dict = strings.string2buf(opt.dictionary);
    } else if (toString$1.call(opt.dictionary) === '[object ArrayBuffer]') {
      dict = new Uint8Array(opt.dictionary);
    } else {
      dict = opt.dictionary;
    }
    status = deflate_1$2.deflateSetDictionary(this.strm, dict);
    if (status !== Z_OK$2) {
      throw new Error(messages[status]);
    }
    this._dict_set = true;
  }
}
Deflate$1.prototype.push = function (data, flush_mode) {
  const strm = this.strm;
  const chunkSize = this.options.chunkSize;
  let status, _flush_mode;
  if (this.ended) { return false; }
  if (flush_mode === ~~flush_mode) _flush_mode = flush_mode;
  else _flush_mode = flush_mode === true ? Z_FINISH$2 : Z_NO_FLUSH$1;
  if (typeof data === 'string') {
    strm.input = strings.string2buf(data);
  } else if (toString$1.call(data) === '[object ArrayBuffer]') {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }
  strm.next_in = 0;
  strm.avail_in = strm.input.length;
  for (;;) {
    if (strm.avail_out === 0) {
      strm.output = new Uint8Array(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }
    if ((_flush_mode === Z_SYNC_FLUSH || _flush_mode === Z_FULL_FLUSH) && strm.avail_out <= 6) {
      this.onData(strm.output.subarray(0, strm.next_out));
      strm.avail_out = 0;
      continue;
    }
    status = deflate_1$2.deflate(strm, _flush_mode);
    if (status === Z_STREAM_END$2) {
      if (strm.next_out > 0) {
        this.onData(strm.output.subarray(0, strm.next_out));
      }
      status = deflate_1$2.deflateEnd(this.strm);
      this.onEnd(status);
      this.ended = true;
      return status === Z_OK$2;
    }
    if (strm.avail_out === 0) {
      this.onData(strm.output);
      continue;
    }
    if (_flush_mode > 0 && strm.next_out > 0) {
      this.onData(strm.output.subarray(0, strm.next_out));
      strm.avail_out = 0;
      continue;
    }
    if (strm.avail_in === 0) break;
  }
  return true;
};
Deflate$1.prototype.onData = function (chunk) {
  this.chunks.push(chunk);
};
Deflate$1.prototype.onEnd = function (status) {
  if (status === Z_OK$2) {
    this.result = common.flattenChunks(this.chunks);
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};
function deflate$1(input, options) {
  const deflator = new Deflate$1(options);
  deflator.push(input, true);
  if (deflator.err) { throw deflator.msg || messages[deflator.err]; }
  return deflator.result;
}
function deflateRaw$1(input, options) {
  options = options || {};
  options.raw = true;
  return deflate$1(input, options);
}
function gzip$1(input, options) {
  options = options || {};
  options.gzip = true;
  return deflate$1(input, options);
}
var Deflate_1$1 = Deflate$1;
var deflate_2 = deflate$1;
var deflateRaw_1$1 = deflateRaw$1;
var gzip_1$1 = gzip$1;
var deflate_1$1 = {
	Deflate: Deflate_1$1,
	deflate: deflate_2,
	deflateRaw: deflateRaw_1$1,
	gzip: gzip_1$1};
const BAD$1 = 16209;
const TYPE$1 = 16191;
var inffast = function inflate_fast(strm, start) {
  let _in;
  let last;
  let _out;
  let beg;
  let end;
  let dmax;
  let wsize;
  let whave;
  let wnext;
  let s_window;
  let hold;
  let bits;
  let lcode;
  let dcode;
  let lmask;
  let dmask;
  let here;
  let op;
  let len;
  let dist;
  let from;
  let from_source;
  let input, output;
  const state = strm.state;
  _in = strm.next_in;
  input = strm.input;
  last = _in + (strm.avail_in - 5);
  _out = strm.next_out;
  output = strm.output;
  beg = _out - (start - strm.avail_out);
  end = _out + (strm.avail_out - 257);
  dmax = state.dmax;
  wsize = state.wsize;
  whave = state.whave;
  wnext = state.wnext;
  s_window = state.window;
  hold = state.hold;
  bits = state.bits;
  lcode = state.lencode;
  dcode = state.distcode;
  lmask = (1 << state.lenbits) - 1;
  dmask = (1 << state.distbits) - 1;
  top:
  do {
    if (bits < 15) {
      hold += input[_in++] << bits;
      bits += 8;
      hold += input[_in++] << bits;
      bits += 8;
    }
    here = lcode[hold & lmask];
    dolen:
    for (;;) {
      op = here >>> 24;
      hold >>>= op;
      bits -= op;
      op = (here >>> 16) & 0xff;
      if (op === 0) {
        output[_out++] = here & 0xffff;
      }
      else if (op & 16) {
        len = here & 0xffff;
        op &= 15;
        if (op) {
          if (bits < op) {
            hold += input[_in++] << bits;
            bits += 8;
          }
          len += hold & ((1 << op) - 1);
          hold >>>= op;
          bits -= op;
        }
        if (bits < 15) {
          hold += input[_in++] << bits;
          bits += 8;
          hold += input[_in++] << bits;
          bits += 8;
        }
        here = dcode[hold & dmask];
        dodist:
        for (;;) {
          op = here >>> 24;
          hold >>>= op;
          bits -= op;
          op = (here >>> 16) & 0xff;
          if (op & 16) {
            dist = here & 0xffff;
            op &= 15;
            if (bits < op) {
              hold += input[_in++] << bits;
              bits += 8;
              if (bits < op) {
                hold += input[_in++] << bits;
                bits += 8;
              }
            }
            dist += hold & ((1 << op) - 1);
            if (dist > dmax) {
              strm.msg = 'invalid distance too far back';
              state.mode = BAD$1;
              break top;
            }
            hold >>>= op;
            bits -= op;
            op = _out - beg;
            if (dist > op) {
              op = dist - op;
              if (op > whave) {
                if (state.sane) {
                  strm.msg = 'invalid distance too far back';
                  state.mode = BAD$1;
                  break top;
                }
              }
              from = 0;
              from_source = s_window;
              if (wnext === 0) {
                from += wsize - op;
                if (op < len) {
                  len -= op;
                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);
                  from = _out - dist;
                  from_source = output;
                }
              }
              else if (wnext < op) {
                from += wsize + wnext - op;
                op -= wnext;
                if (op < len) {
                  len -= op;
                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);
                  from = 0;
                  if (wnext < len) {
                    op = wnext;
                    len -= op;
                    do {
                      output[_out++] = s_window[from++];
                    } while (--op);
                    from = _out - dist;
                    from_source = output;
                  }
                }
              }
              else {
                from += wnext - op;
                if (op < len) {
                  len -= op;
                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);
                  from = _out - dist;
                  from_source = output;
                }
              }
              while (len > 2) {
                output[_out++] = from_source[from++];
                output[_out++] = from_source[from++];
                output[_out++] = from_source[from++];
                len -= 3;
              }
              if (len) {
                output[_out++] = from_source[from++];
                if (len > 1) {
                  output[_out++] = from_source[from++];
                }
              }
            }
            else {
              from = _out - dist;
              do {
                output[_out++] = output[from++];
                output[_out++] = output[from++];
                output[_out++] = output[from++];
                len -= 3;
              } while (len > 2);
              if (len) {
                output[_out++] = output[from++];
                if (len > 1) {
                  output[_out++] = output[from++];
                }
              }
            }
          }
          else if ((op & 64) === 0) {
            here = dcode[(here & 0xffff) + (hold & ((1 << op) - 1))];
            continue dodist;
          }
          else {
            strm.msg = 'invalid distance code';
            state.mode = BAD$1;
            break top;
          }
          break;
        }
      }
      else if ((op & 64) === 0) {
        here = lcode[(here & 0xffff) + (hold & ((1 << op) - 1))];
        continue dolen;
      }
      else if (op & 32) {
        state.mode = TYPE$1;
        break top;
      }
      else {
        strm.msg = 'invalid literal/length code';
        state.mode = BAD$1;
        break top;
      }
      break;
    }
  } while (_in < last && _out < end);
  len = bits >> 3;
  _in -= len;
  bits -= len << 3;
  hold &= (1 << bits) - 1;
  strm.next_in = _in;
  strm.next_out = _out;
  strm.avail_in = (_in < last ? 5 + (last - _in) : 5 - (_in - last));
  strm.avail_out = (_out < end ? 257 + (end - _out) : 257 - (_out - end));
  state.hold = hold;
  state.bits = bits;
  return;
};
const MAXBITS = 15;
const ENOUGH_LENS$1 = 852;
const ENOUGH_DISTS$1 = 592;
const CODES$1 = 0;
const LENS$1 = 1;
const DISTS$1 = 2;
const lbase = new Uint16Array([
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
  35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
]);
const lext = new Uint8Array([
  16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18,
  19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78
]);
const dbase = new Uint16Array([
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
  257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
  8193, 12289, 16385, 24577, 0, 0
]);
const dext = new Uint8Array([
  16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22,
  23, 23, 24, 24, 25, 25, 26, 26, 27, 27,
  28, 28, 29, 29, 64, 64
]);
const inflate_table = (type, lens, lens_index, codes, table, table_index, work, opts) =>
{
  const bits = opts.bits;
  let len = 0;
  let sym = 0;
  let min = 0, max = 0;
  let root = 0;
  let curr = 0;
  let drop = 0;
  let left = 0;
  let used = 0;
  let huff = 0;
  let incr;
  let fill;
  let low;
  let mask;
  let next;
  let base = null;
  let match;
  const count = new Uint16Array(MAXBITS + 1);
  const offs = new Uint16Array(MAXBITS + 1);
  let extra = null;
  let here_bits, here_op, here_val;
  for (len = 0; len <= MAXBITS; len++) {
    count[len] = 0;
  }
  for (sym = 0; sym < codes; sym++) {
    count[lens[lens_index + sym]]++;
  }
  root = bits;
  for (max = MAXBITS; max >= 1; max--) {
    if (count[max] !== 0) { break; }
  }
  if (root > max) {
    root = max;
  }
  if (max === 0) {
    table[table_index++] = (1 << 24) | (64 << 16) | 0;
    table[table_index++] = (1 << 24) | (64 << 16) | 0;
    opts.bits = 1;
    return 0;
  }
  for (min = 1; min < max; min++) {
    if (count[min] !== 0) { break; }
  }
  if (root < min) {
    root = min;
  }
  left = 1;
  for (len = 1; len <= MAXBITS; len++) {
    left <<= 1;
    left -= count[len];
    if (left < 0) {
      return -1;
    }
  }
  if (left > 0 && (type === CODES$1 || max !== 1)) {
    return -1;
  }
  offs[1] = 0;
  for (len = 1; len < MAXBITS; len++) {
    offs[len + 1] = offs[len] + count[len];
  }
  for (sym = 0; sym < codes; sym++) {
    if (lens[lens_index + sym] !== 0) {
      work[offs[lens[lens_index + sym]]++] = sym;
    }
  }
  if (type === CODES$1) {
    base = extra = work;
    match = 20;
  } else if (type === LENS$1) {
    base = lbase;
    extra = lext;
    match = 257;
  } else {
    base = dbase;
    extra = dext;
    match = 0;
  }
  huff = 0;
  sym = 0;
  len = min;
  next = table_index;
  curr = root;
  drop = 0;
  low = -1;
  used = 1 << root;
  mask = used - 1;
  if ((type === LENS$1 && used > ENOUGH_LENS$1) ||
    (type === DISTS$1 && used > ENOUGH_DISTS$1)) {
    return 1;
  }
  for (;;) {
    here_bits = len - drop;
    if (work[sym] + 1 < match) {
      here_op = 0;
      here_val = work[sym];
    }
    else if (work[sym] >= match) {
      here_op = extra[work[sym] - match];
      here_val = base[work[sym] - match];
    }
    else {
      here_op = 32 + 64;
      here_val = 0;
    }
    incr = 1 << (len - drop);
    fill = 1 << curr;
    min = fill;
    do {
      fill -= incr;
      table[next + (huff >> drop) + fill] = (here_bits << 24) | (here_op << 16) | here_val |0;
    } while (fill !== 0);
    incr = 1 << (len - 1);
    while (huff & incr) {
      incr >>= 1;
    }
    if (incr !== 0) {
      huff &= incr - 1;
      huff += incr;
    } else {
      huff = 0;
    }
    sym++;
    if (--count[len] === 0) {
      if (len === max) { break; }
      len = lens[lens_index + work[sym]];
    }
    if (len > root && (huff & mask) !== low) {
      if (drop === 0) {
        drop = root;
      }
      next += min;
      curr = len - drop;
      left = 1 << curr;
      while (curr + drop < max) {
        left -= count[curr + drop];
        if (left <= 0) { break; }
        curr++;
        left <<= 1;
      }
      used += 1 << curr;
      if ((type === LENS$1 && used > ENOUGH_LENS$1) ||
        (type === DISTS$1 && used > ENOUGH_DISTS$1)) {
        return 1;
      }
      low = huff & mask;
      table[low] = (root << 24) | (curr << 16) | (next - table_index) |0;
    }
  }
  if (huff !== 0) {
    table[next + huff] = ((len - drop) << 24) | (64 << 16) |0;
  }
  opts.bits = root;
  return 0;
};
var inftrees = inflate_table;
const CODES = 0;
const LENS = 1;
const DISTS = 2;
const {
  Z_FINISH: Z_FINISH$1, Z_BLOCK, Z_TREES,
  Z_OK: Z_OK$1, Z_STREAM_END: Z_STREAM_END$1, Z_NEED_DICT: Z_NEED_DICT$1, Z_STREAM_ERROR: Z_STREAM_ERROR$1, Z_DATA_ERROR: Z_DATA_ERROR$1, Z_MEM_ERROR: Z_MEM_ERROR$1, Z_BUF_ERROR,
  Z_DEFLATED
} = constants$2;
const    HEAD = 16180;
const    FLAGS = 16181;
const    TIME = 16182;
const    OS = 16183;
const    EXLEN = 16184;
const    EXTRA = 16185;
const    NAME = 16186;
const    COMMENT = 16187;
const    HCRC = 16188;
const    DICTID = 16189;
const    DICT = 16190;
const        TYPE = 16191;
const        TYPEDO = 16192;
const        STORED = 16193;
const        COPY_ = 16194;
const        COPY = 16195;
const        TABLE = 16196;
const        LENLENS = 16197;
const        CODELENS = 16198;
const            LEN_ = 16199;
const            LEN = 16200;
const            LENEXT = 16201;
const            DIST = 16202;
const            DISTEXT = 16203;
const            MATCH = 16204;
const            LIT = 16205;
const    CHECK = 16206;
const    LENGTH = 16207;
const    DONE = 16208;
const    BAD = 16209;
const    MEM = 16210;
const    SYNC = 16211;
const ENOUGH_LENS = 852;
const ENOUGH_DISTS = 592;
const MAX_WBITS = 15;
const DEF_WBITS = MAX_WBITS;
const zswap32 = (q) => {
  return  (((q >>> 24) & 0xff) +
          ((q >>> 8) & 0xff00) +
          ((q & 0xff00) << 8) +
          ((q & 0xff) << 24));
};
function InflateState() {
  this.strm = null;
  this.mode = 0;
  this.last = false;
  this.wrap = 0;
  this.havedict = false;
  this.flags = 0;
  this.dmax = 0;
  this.check = 0;
  this.total = 0;
  this.head = null;
  this.wbits = 0;
  this.wsize = 0;
  this.whave = 0;
  this.wnext = 0;
  this.window = null;
  this.hold = 0;
  this.bits = 0;
  this.length = 0;
  this.offset = 0;
  this.extra = 0;
  this.lencode = null;
  this.distcode = null;
  this.lenbits = 0;
  this.distbits = 0;
  this.ncode = 0;
  this.nlen = 0;
  this.ndist = 0;
  this.have = 0;
  this.next = null;
  this.lens = new Uint16Array(320);
  this.work = new Uint16Array(288);
  this.lendyn = null;
  this.distdyn = null;
  this.sane = 0;
  this.back = 0;
  this.was = 0;
}
const inflateStateCheck = (strm) => {
  if (!strm) {
    return 1;
  }
  const state = strm.state;
  if (!state || state.strm !== strm ||
    state.mode < HEAD || state.mode > SYNC) {
    return 1;
  }
  return 0;
};
const inflateResetKeep = (strm) => {
  if (inflateStateCheck(strm)) { return Z_STREAM_ERROR$1; }
  const state = strm.state;
  strm.total_in = strm.total_out = state.total = 0;
  strm.msg = '';
  if (state.wrap) {
    strm.adler = state.wrap & 1;
  }
  state.mode = HEAD;
  state.last = 0;
  state.havedict = 0;
  state.flags = -1;
  state.dmax = 32768;
  state.head = null;
  state.hold = 0;
  state.bits = 0;
  state.lencode = state.lendyn = new Int32Array(ENOUGH_LENS);
  state.distcode = state.distdyn = new Int32Array(ENOUGH_DISTS);
  state.sane = 1;
  state.back = -1;
  return Z_OK$1;
};
const inflateReset = (strm) => {
  if (inflateStateCheck(strm)) { return Z_STREAM_ERROR$1; }
  const state = strm.state;
  state.wsize = 0;
  state.whave = 0;
  state.wnext = 0;
  return inflateResetKeep(strm);
};
const inflateReset2 = (strm, windowBits) => {
  let wrap;
  if (inflateStateCheck(strm)) { return Z_STREAM_ERROR$1; }
  const state = strm.state;
  if (windowBits < 0) {
    wrap = 0;
    windowBits = -windowBits;
  }
  else {
    wrap = (windowBits >> 4) + 5;
    if (windowBits < 48) {
      windowBits &= 15;
    }
  }
  if (windowBits && (windowBits < 8 || windowBits > 15)) {
    return Z_STREAM_ERROR$1;
  }
  if (state.window !== null && state.wbits !== windowBits) {
    state.window = null;
  }
  state.wrap = wrap;
  state.wbits = windowBits;
  return inflateReset(strm);
};
const inflateInit2 = (strm, windowBits) => {
  if (!strm) { return Z_STREAM_ERROR$1; }
  const state = new InflateState();
  strm.state = state;
  state.strm = strm;
  state.window = null;
  state.mode = HEAD;
  const ret = inflateReset2(strm, windowBits);
  if (ret !== Z_OK$1) {
    strm.state = null;
  }
  return ret;
};
const inflateInit = (strm) => {
  return inflateInit2(strm, DEF_WBITS);
};
let virgin = true;
let lenfix, distfix;
const fixedtables = (state) => {
  if (virgin) {
    lenfix = new Int32Array(512);
    distfix = new Int32Array(32);
    let sym = 0;
    while (sym < 144) { state.lens[sym++] = 8; }
    while (sym < 256) { state.lens[sym++] = 9; }
    while (sym < 280) { state.lens[sym++] = 7; }
    while (sym < 288) { state.lens[sym++] = 8; }
    inftrees(LENS,  state.lens, 0, 288, lenfix,   0, state.work, { bits: 9 });
    sym = 0;
    while (sym < 32) { state.lens[sym++] = 5; }
    inftrees(DISTS, state.lens, 0, 32,   distfix, 0, state.work, { bits: 5 });
    virgin = false;
  }
  state.lencode = lenfix;
  state.lenbits = 9;
  state.distcode = distfix;
  state.distbits = 5;
};
const updatewindow = (strm, src, end, copy) => {
  let dist;
  const state = strm.state;
  if (state.window === null) {
    state.wsize = 1 << state.wbits;
    state.wnext = 0;
    state.whave = 0;
    state.window = new Uint8Array(state.wsize);
  }
  if (copy >= state.wsize) {
    state.window.set(src.subarray(end - state.wsize, end), 0);
    state.wnext = 0;
    state.whave = state.wsize;
  }
  else {
    dist = state.wsize - state.wnext;
    if (dist > copy) {
      dist = copy;
    }
    state.window.set(src.subarray(end - copy, end - copy + dist), state.wnext);
    copy -= dist;
    if (copy) {
      state.window.set(src.subarray(end - copy, end), 0);
      state.wnext = copy;
      state.whave = state.wsize;
    }
    else {
      state.wnext += dist;
      if (state.wnext === state.wsize) { state.wnext = 0; }
      if (state.whave < state.wsize) { state.whave += dist; }
    }
  }
  return 0;
};
const inflate$2 = (strm, flush) => {
  let state;
  let input, output;
  let next;
  let put;
  let have, left;
  let hold;
  let bits;
  let _in, _out;
  let copy;
  let from;
  let from_source;
  let here = 0;
  let here_bits, here_op, here_val;
  let last_bits, last_op, last_val;
  let len;
  let ret;
  const hbuf = new Uint8Array(4);
  let opts;
  let n;
  const order =
    new Uint8Array([ 16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15 ]);
  if (inflateStateCheck(strm) || !strm.output ||
      (!strm.input && strm.avail_in !== 0)) {
    return Z_STREAM_ERROR$1;
  }
  state = strm.state;
  if (state.mode === TYPE) { state.mode = TYPEDO; }
  put = strm.next_out;
  output = strm.output;
  left = strm.avail_out;
  next = strm.next_in;
  input = strm.input;
  have = strm.avail_in;
  hold = state.hold;
  bits = state.bits;
  _in = have;
  _out = left;
  ret = Z_OK$1;
  inf_leave:
  for (;;) {
    switch (state.mode) {
      case HEAD:
        if (state.wrap === 0) {
          state.mode = TYPEDO;
          break;
        }
        while (bits < 16) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        if ((state.wrap & 2) && hold === 0x8b1f) {
          if (state.wbits === 0) {
            state.wbits = 15;
          }
          state.check = 0;
          hbuf[0] = hold & 0xff;
          hbuf[1] = (hold >>> 8) & 0xff;
          state.check = crc32_1(state.check, hbuf, 2, 0);
          hold = 0;
          bits = 0;
          state.mode = FLAGS;
          break;
        }
        if (state.head) {
          state.head.done = false;
        }
        if (!(state.wrap & 1) ||
          (((hold & 0xff) << 8) + (hold >> 8)) % 31) {
          strm.msg = 'incorrect header check';
          state.mode = BAD;
          break;
        }
        if ((hold & 0x0f) !== Z_DEFLATED) {
          strm.msg = 'unknown compression method';
          state.mode = BAD;
          break;
        }
        hold >>>= 4;
        bits -= 4;
        len = (hold & 0x0f) + 8;
        if (state.wbits === 0) {
          state.wbits = len;
        }
        if (len > 15 || len > state.wbits) {
          strm.msg = 'invalid window size';
          state.mode = BAD;
          break;
        }
        state.dmax = 1 << state.wbits;
        state.flags = 0;
        strm.adler = state.check = 1;
        state.mode = hold & 0x200 ? DICTID : TYPE;
        hold = 0;
        bits = 0;
        break;
      case FLAGS:
        while (bits < 16) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        state.flags = hold;
        if ((state.flags & 0xff) !== Z_DEFLATED) {
          strm.msg = 'unknown compression method';
          state.mode = BAD;
          break;
        }
        if (state.flags & 0xe000) {
          strm.msg = 'unknown header flags set';
          state.mode = BAD;
          break;
        }
        if (state.head) {
          state.head.text = ((hold >> 8) & 1);
        }
        if ((state.flags & 0x0200) && (state.wrap & 4)) {
          hbuf[0] = hold & 0xff;
          hbuf[1] = (hold >>> 8) & 0xff;
          state.check = crc32_1(state.check, hbuf, 2, 0);
        }
        hold = 0;
        bits = 0;
        state.mode = TIME;
      case TIME:
        while (bits < 32) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        if (state.head) {
          state.head.time = hold;
        }
        if ((state.flags & 0x0200) && (state.wrap & 4)) {
          hbuf[0] = hold & 0xff;
          hbuf[1] = (hold >>> 8) & 0xff;
          hbuf[2] = (hold >>> 16) & 0xff;
          hbuf[3] = (hold >>> 24) & 0xff;
          state.check = crc32_1(state.check, hbuf, 4, 0);
        }
        hold = 0;
        bits = 0;
        state.mode = OS;
      case OS:
        while (bits < 16) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        if (state.head) {
          state.head.xflags = (hold & 0xff);
          state.head.os = (hold >> 8);
        }
        if ((state.flags & 0x0200) && (state.wrap & 4)) {
          hbuf[0] = hold & 0xff;
          hbuf[1] = (hold >>> 8) & 0xff;
          state.check = crc32_1(state.check, hbuf, 2, 0);
        }
        hold = 0;
        bits = 0;
        state.mode = EXLEN;
      case EXLEN:
        if (state.flags & 0x0400) {
          while (bits < 16) {
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          state.length = hold;
          if (state.head) {
            state.head.extra_len = hold;
          }
          if ((state.flags & 0x0200) && (state.wrap & 4)) {
            hbuf[0] = hold & 0xff;
            hbuf[1] = (hold >>> 8) & 0xff;
            state.check = crc32_1(state.check, hbuf, 2, 0);
          }
          hold = 0;
          bits = 0;
        }
        else if (state.head) {
          state.head.extra = null;
        }
        state.mode = EXTRA;
      case EXTRA:
        if (state.flags & 0x0400) {
          copy = state.length;
          if (copy > have) { copy = have; }
          if (copy) {
            if (state.head) {
              len = state.head.extra_len - state.length;
              if (!state.head.extra) {
                state.head.extra = new Uint8Array(state.head.extra_len);
              }
              state.head.extra.set(
                input.subarray(
                  next,
                  next + copy
                ),
                len
              );
            }
            if ((state.flags & 0x0200) && (state.wrap & 4)) {
              state.check = crc32_1(state.check, input, copy, next);
            }
            have -= copy;
            next += copy;
            state.length -= copy;
          }
          if (state.length) { break inf_leave; }
        }
        state.length = 0;
        state.mode = NAME;
      case NAME:
        if (state.flags & 0x0800) {
          if (have === 0) { break inf_leave; }
          copy = 0;
          do {
            len = input[next + copy++];
            if (state.head && len &&
                (state.length < 65536 )) {
              state.head.name += String.fromCharCode(len);
            }
          } while (len && copy < have);
          if ((state.flags & 0x0200) && (state.wrap & 4)) {
            state.check = crc32_1(state.check, input, copy, next);
          }
          have -= copy;
          next += copy;
          if (len) { break inf_leave; }
        }
        else if (state.head) {
          state.head.name = null;
        }
        state.length = 0;
        state.mode = COMMENT;
      case COMMENT:
        if (state.flags & 0x1000) {
          if (have === 0) { break inf_leave; }
          copy = 0;
          do {
            len = input[next + copy++];
            if (state.head && len &&
                (state.length < 65536 )) {
              state.head.comment += String.fromCharCode(len);
            }
          } while (len && copy < have);
          if ((state.flags & 0x0200) && (state.wrap & 4)) {
            state.check = crc32_1(state.check, input, copy, next);
          }
          have -= copy;
          next += copy;
          if (len) { break inf_leave; }
        }
        else if (state.head) {
          state.head.comment = null;
        }
        state.mode = HCRC;
      case HCRC:
        if (state.flags & 0x0200) {
          while (bits < 16) {
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if ((state.wrap & 4) && hold !== (state.check & 0xffff)) {
            strm.msg = 'header crc mismatch';
            state.mode = BAD;
            break;
          }
          hold = 0;
          bits = 0;
        }
        if (state.head) {
          state.head.hcrc = ((state.flags >> 9) & 1);
          state.head.done = true;
        }
        strm.adler = state.check = 0;
        state.mode = TYPE;
        break;
      case DICTID:
        while (bits < 32) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        strm.adler = state.check = zswap32(hold);
        hold = 0;
        bits = 0;
        state.mode = DICT;
      case DICT:
        if (state.havedict === 0) {
          strm.next_out = put;
          strm.avail_out = left;
          strm.next_in = next;
          strm.avail_in = have;
          state.hold = hold;
          state.bits = bits;
          return Z_NEED_DICT$1;
        }
        strm.adler = state.check = 1;
        state.mode = TYPE;
      case TYPE:
        if (flush === Z_BLOCK || flush === Z_TREES) { break inf_leave; }
      case TYPEDO:
        if (state.last) {
          hold >>>= bits & 7;
          bits -= bits & 7;
          state.mode = CHECK;
          break;
        }
        while (bits < 3) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        state.last = (hold & 0x01);
        hold >>>= 1;
        bits -= 1;
        switch ((hold & 0x03)) {
          case 0:
            state.mode = STORED;
            break;
          case 1:
            fixedtables(state);
            state.mode = LEN_;
            if (flush === Z_TREES) {
              hold >>>= 2;
              bits -= 2;
              break inf_leave;
            }
            break;
          case 2:
            state.mode = TABLE;
            break;
          case 3:
            strm.msg = 'invalid block type';
            state.mode = BAD;
        }
        hold >>>= 2;
        bits -= 2;
        break;
      case STORED:
        hold >>>= bits & 7;
        bits -= bits & 7;
        while (bits < 32) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        if ((hold & 0xffff) !== ((hold >>> 16) ^ 0xffff)) {
          strm.msg = 'invalid stored block lengths';
          state.mode = BAD;
          break;
        }
        state.length = hold & 0xffff;
        hold = 0;
        bits = 0;
        state.mode = COPY_;
        if (flush === Z_TREES) { break inf_leave; }
      case COPY_:
        state.mode = COPY;
      case COPY:
        copy = state.length;
        if (copy) {
          if (copy > have) { copy = have; }
          if (copy > left) { copy = left; }
          if (copy === 0) { break inf_leave; }
          output.set(input.subarray(next, next + copy), put);
          have -= copy;
          next += copy;
          left -= copy;
          put += copy;
          state.length -= copy;
          break;
        }
        state.mode = TYPE;
        break;
      case TABLE:
        while (bits < 14) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        state.nlen = (hold & 0x1f) + 257;
        hold >>>= 5;
        bits -= 5;
        state.ndist = (hold & 0x1f) + 1;
        hold >>>= 5;
        bits -= 5;
        state.ncode = (hold & 0x0f) + 4;
        hold >>>= 4;
        bits -= 4;
        if (state.nlen > 286 || state.ndist > 30) {
          strm.msg = 'too many length or distance symbols';
          state.mode = BAD;
          break;
        }
        state.have = 0;
        state.mode = LENLENS;
      case LENLENS:
        while (state.have < state.ncode) {
          while (bits < 3) {
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          state.lens[order[state.have++]] = (hold & 0x07);
          hold >>>= 3;
          bits -= 3;
        }
        while (state.have < 19) {
          state.lens[order[state.have++]] = 0;
        }
        state.lencode = state.lendyn;
        state.lenbits = 7;
        opts = { bits: state.lenbits };
        ret = inftrees(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
        state.lenbits = opts.bits;
        if (ret) {
          strm.msg = 'invalid code lengths set';
          state.mode = BAD;
          break;
        }
        state.have = 0;
        state.mode = CODELENS;
      case CODELENS:
        while (state.have < state.nlen + state.ndist) {
          for (;;) {
            here = state.lencode[hold & ((1 << state.lenbits) - 1)];
            here_bits = here >>> 24;
            here_op = (here >>> 16) & 0xff;
            here_val = here & 0xffff;
            if ((here_bits) <= bits) { break; }
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if (here_val < 16) {
            hold >>>= here_bits;
            bits -= here_bits;
            state.lens[state.have++] = here_val;
          }
          else {
            if (here_val === 16) {
              n = here_bits + 2;
              while (bits < n) {
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              hold >>>= here_bits;
              bits -= here_bits;
              if (state.have === 0) {
                strm.msg = 'invalid bit length repeat';
                state.mode = BAD;
                break;
              }
              len = state.lens[state.have - 1];
              copy = 3 + (hold & 0x03);
              hold >>>= 2;
              bits -= 2;
            }
            else if (here_val === 17) {
              n = here_bits + 3;
              while (bits < n) {
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              hold >>>= here_bits;
              bits -= here_bits;
              len = 0;
              copy = 3 + (hold & 0x07);
              hold >>>= 3;
              bits -= 3;
            }
            else {
              n = here_bits + 7;
              while (bits < n) {
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              hold >>>= here_bits;
              bits -= here_bits;
              len = 0;
              copy = 11 + (hold & 0x7f);
              hold >>>= 7;
              bits -= 7;
            }
            if (state.have + copy > state.nlen + state.ndist) {
              strm.msg = 'invalid bit length repeat';
              state.mode = BAD;
              break;
            }
            while (copy--) {
              state.lens[state.have++] = len;
            }
          }
        }
        if (state.mode === BAD) { break; }
        if (state.lens[256] === 0) {
          strm.msg = 'invalid code -- missing end-of-block';
          state.mode = BAD;
          break;
        }
        state.lenbits = 9;
        opts = { bits: state.lenbits };
        ret = inftrees(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
        state.lenbits = opts.bits;
        if (ret) {
          strm.msg = 'invalid literal/lengths set';
          state.mode = BAD;
          break;
        }
        state.distbits = 6;
        state.distcode = state.distdyn;
        opts = { bits: state.distbits };
        ret = inftrees(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
        state.distbits = opts.bits;
        if (ret) {
          strm.msg = 'invalid distances set';
          state.mode = BAD;
          break;
        }
        state.mode = LEN_;
        if (flush === Z_TREES) { break inf_leave; }
      case LEN_:
        state.mode = LEN;
      case LEN:
        if (have >= 6 && left >= 258) {
          strm.next_out = put;
          strm.avail_out = left;
          strm.next_in = next;
          strm.avail_in = have;
          state.hold = hold;
          state.bits = bits;
          inffast(strm, _out);
          put = strm.next_out;
          output = strm.output;
          left = strm.avail_out;
          next = strm.next_in;
          input = strm.input;
          have = strm.avail_in;
          hold = state.hold;
          bits = state.bits;
          if (state.mode === TYPE) {
            state.back = -1;
          }
          break;
        }
        state.back = 0;
        for (;;) {
          here = state.lencode[hold & ((1 << state.lenbits) - 1)];
          here_bits = here >>> 24;
          here_op = (here >>> 16) & 0xff;
          here_val = here & 0xffff;
          if (here_bits <= bits) { break; }
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        if (here_op && (here_op & 0xf0) === 0) {
          last_bits = here_bits;
          last_op = here_op;
          last_val = here_val;
          for (;;) {
            here = state.lencode[last_val +
                    ((hold & ((1 << (last_bits + last_op)) - 1)) >> last_bits)];
            here_bits = here >>> 24;
            here_op = (here >>> 16) & 0xff;
            here_val = here & 0xffff;
            if ((last_bits + here_bits) <= bits) { break; }
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          hold >>>= last_bits;
          bits -= last_bits;
          state.back += last_bits;
        }
        hold >>>= here_bits;
        bits -= here_bits;
        state.back += here_bits;
        state.length = here_val;
        if (here_op === 0) {
          state.mode = LIT;
          break;
        }
        if (here_op & 32) {
          state.back = -1;
          state.mode = TYPE;
          break;
        }
        if (here_op & 64) {
          strm.msg = 'invalid literal/length code';
          state.mode = BAD;
          break;
        }
        state.extra = here_op & 15;
        state.mode = LENEXT;
      case LENEXT:
        if (state.extra) {
          n = state.extra;
          while (bits < n) {
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          state.length += hold & ((1 << state.extra) - 1);
          hold >>>= state.extra;
          bits -= state.extra;
          state.back += state.extra;
        }
        state.was = state.length;
        state.mode = DIST;
      case DIST:
        for (;;) {
          here = state.distcode[hold & ((1 << state.distbits) - 1)];
          here_bits = here >>> 24;
          here_op = (here >>> 16) & 0xff;
          here_val = here & 0xffff;
          if ((here_bits) <= bits) { break; }
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        if ((here_op & 0xf0) === 0) {
          last_bits = here_bits;
          last_op = here_op;
          last_val = here_val;
          for (;;) {
            here = state.distcode[last_val +
                    ((hold & ((1 << (last_bits + last_op)) - 1)) >> last_bits)];
            here_bits = here >>> 24;
            here_op = (here >>> 16) & 0xff;
            here_val = here & 0xffff;
            if ((last_bits + here_bits) <= bits) { break; }
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          hold >>>= last_bits;
          bits -= last_bits;
          state.back += last_bits;
        }
        hold >>>= here_bits;
        bits -= here_bits;
        state.back += here_bits;
        if (here_op & 64) {
          strm.msg = 'invalid distance code';
          state.mode = BAD;
          break;
        }
        state.offset = here_val;
        state.extra = (here_op) & 15;
        state.mode = DISTEXT;
      case DISTEXT:
        if (state.extra) {
          n = state.extra;
          while (bits < n) {
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          state.offset += hold & ((1 << state.extra) - 1);
          hold >>>= state.extra;
          bits -= state.extra;
          state.back += state.extra;
        }
        if (state.offset > state.dmax) {
          strm.msg = 'invalid distance too far back';
          state.mode = BAD;
          break;
        }
        state.mode = MATCH;
      case MATCH:
        if (left === 0) { break inf_leave; }
        copy = _out - left;
        if (state.offset > copy) {
          copy = state.offset - copy;
          if (copy > state.whave) {
            if (state.sane) {
              strm.msg = 'invalid distance too far back';
              state.mode = BAD;
              break;
            }
          }
          if (copy > state.wnext) {
            copy -= state.wnext;
            from = state.wsize - copy;
          }
          else {
            from = state.wnext - copy;
          }
          if (copy > state.length) { copy = state.length; }
          from_source = state.window;
        }
        else {
          from_source = output;
          from = put - state.offset;
          copy = state.length;
        }
        if (copy > left) { copy = left; }
        left -= copy;
        state.length -= copy;
        do {
          output[put++] = from_source[from++];
        } while (--copy);
        if (state.length === 0) { state.mode = LEN; }
        break;
      case LIT:
        if (left === 0) { break inf_leave; }
        output[put++] = state.length;
        left--;
        state.mode = LEN;
        break;
      case CHECK:
        if (state.wrap) {
          while (bits < 32) {
            if (have === 0) { break inf_leave; }
            have--;
            hold |= input[next++] << bits;
            bits += 8;
          }
          _out -= left;
          strm.total_out += _out;
          state.total += _out;
          if ((state.wrap & 4) && _out) {
            strm.adler = state.check =
                (state.flags ? crc32_1(state.check, output, _out, put - _out) : adler32_1(state.check, output, _out, put - _out));
          }
          _out = left;
          if ((state.wrap & 4) && (state.flags ? hold : zswap32(hold)) !== state.check) {
            strm.msg = 'incorrect data check';
            state.mode = BAD;
            break;
          }
          hold = 0;
          bits = 0;
        }
        state.mode = LENGTH;
      case LENGTH:
        if (state.wrap && state.flags) {
          while (bits < 32) {
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if ((state.wrap & 4) && hold !== (state.total & 0xffffffff)) {
            strm.msg = 'incorrect length check';
            state.mode = BAD;
            break;
          }
          hold = 0;
          bits = 0;
        }
        state.mode = DONE;
      case DONE:
        ret = Z_STREAM_END$1;
        break inf_leave;
      case BAD:
        ret = Z_DATA_ERROR$1;
        break inf_leave;
      case MEM:
        return Z_MEM_ERROR$1;
      case SYNC:
      default:
        return Z_STREAM_ERROR$1;
    }
  }
  strm.next_out = put;
  strm.avail_out = left;
  strm.next_in = next;
  strm.avail_in = have;
  state.hold = hold;
  state.bits = bits;
  if (state.wsize || (_out !== strm.avail_out && state.mode < BAD &&
                      (state.mode < CHECK || flush !== Z_FINISH$1))) {
    if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) ;
  }
  _in -= strm.avail_in;
  _out -= strm.avail_out;
  strm.total_in += _in;
  strm.total_out += _out;
  state.total += _out;
  if ((state.wrap & 4) && _out) {
    strm.adler = state.check =
      (state.flags ? crc32_1(state.check, output, _out, strm.next_out - _out) : adler32_1(state.check, output, _out, strm.next_out - _out));
  }
  strm.data_type = state.bits + (state.last ? 64 : 0) +
                    (state.mode === TYPE ? 128 : 0) +
                    (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
  if (((_in === 0 && _out === 0) || flush === Z_FINISH$1) && ret === Z_OK$1) {
    ret = Z_BUF_ERROR;
  }
  return ret;
};
const inflateEnd = (strm) => {
  if (inflateStateCheck(strm)) {
    return Z_STREAM_ERROR$1;
  }
  let state = strm.state;
  if (state.window) {
    state.window = null;
  }
  strm.state = null;
  return Z_OK$1;
};
const inflateGetHeader = (strm, head) => {
  if (inflateStateCheck(strm)) { return Z_STREAM_ERROR$1; }
  const state = strm.state;
  if ((state.wrap & 2) === 0) { return Z_STREAM_ERROR$1; }
  state.head = head;
  head.done = false;
  return Z_OK$1;
};
const inflateSetDictionary = (strm, dictionary) => {
  const dictLength = dictionary.length;
  let state;
  let dictid;
  let ret;
  if (inflateStateCheck(strm)) { return Z_STREAM_ERROR$1; }
  state = strm.state;
  if (state.wrap !== 0 && state.mode !== DICT) {
    return Z_STREAM_ERROR$1;
  }
  if (state.mode === DICT) {
    dictid = 1;
    dictid = adler32_1(dictid, dictionary, dictLength, 0);
    if (dictid !== state.check) {
      return Z_DATA_ERROR$1;
    }
  }
  ret = updatewindow(strm, dictionary, dictLength, dictLength);
  if (ret) {
    state.mode = MEM;
    return Z_MEM_ERROR$1;
  }
  state.havedict = 1;
  return Z_OK$1;
};
var inflateReset_1 = inflateReset;
var inflateReset2_1 = inflateReset2;
var inflateResetKeep_1 = inflateResetKeep;
var inflateInit_1 = inflateInit;
var inflateInit2_1 = inflateInit2;
var inflate_2$1 = inflate$2;
var inflateEnd_1 = inflateEnd;
var inflateGetHeader_1 = inflateGetHeader;
var inflateSetDictionary_1 = inflateSetDictionary;
var inflateInfo = 'pako inflate (from Nodeca project)';
var inflate_1$2 = {
	inflateReset: inflateReset_1,
	inflateReset2: inflateReset2_1,
	inflateResetKeep: inflateResetKeep_1,
	inflateInit: inflateInit_1,
	inflateInit2: inflateInit2_1,
	inflate: inflate_2$1,
	inflateEnd: inflateEnd_1,
	inflateGetHeader: inflateGetHeader_1,
	inflateSetDictionary: inflateSetDictionary_1,
	inflateInfo: inflateInfo
};
function GZheader() {
  this.text       = 0;
  this.time       = 0;
  this.xflags     = 0;
  this.os         = 0;
  this.extra      = null;
  this.extra_len  = 0;
  this.name       = '';
  this.comment    = '';
  this.hcrc       = 0;
  this.done       = false;
}
var gzheader = GZheader;
const toString = Object.prototype.toString;
const {
  Z_NO_FLUSH, Z_FINISH,
  Z_OK, Z_STREAM_END, Z_NEED_DICT, Z_STREAM_ERROR, Z_DATA_ERROR, Z_MEM_ERROR
} = constants$2;
function Inflate$1(options) {
  this.options = common.assign({
    chunkSize: 1024 * 64,
    windowBits: 15,
    to: ''
  }, options || {});
  const opt = this.options;
  if (opt.raw && (opt.windowBits >= 0) && (opt.windowBits < 16)) {
    opt.windowBits = -opt.windowBits;
    if (opt.windowBits === 0) { opt.windowBits = -15; }
  }
  if ((opt.windowBits >= 0) && (opt.windowBits < 16) &&
      !(options && options.windowBits)) {
    opt.windowBits += 32;
  }
  if ((opt.windowBits > 15) && (opt.windowBits < 48)) {
    if ((opt.windowBits & 15) === 0) {
      opt.windowBits |= 15;
    }
  }
  this.err    = 0;
  this.msg    = '';
  this.ended  = false;
  this.chunks = [];
  this.strm   = new zstream();
  this.strm.avail_out = 0;
  let status  = inflate_1$2.inflateInit2(
    this.strm,
    opt.windowBits
  );
  if (status !== Z_OK) {
    throw new Error(messages[status]);
  }
  this.header = new gzheader();
  inflate_1$2.inflateGetHeader(this.strm, this.header);
  if (opt.dictionary) {
    if (typeof opt.dictionary === 'string') {
      opt.dictionary = strings.string2buf(opt.dictionary);
    } else if (toString.call(opt.dictionary) === '[object ArrayBuffer]') {
      opt.dictionary = new Uint8Array(opt.dictionary);
    }
    if (opt.raw) {
      status = inflate_1$2.inflateSetDictionary(this.strm, opt.dictionary);
      if (status !== Z_OK) {
        throw new Error(messages[status]);
      }
    }
  }
}
Inflate$1.prototype.push = function (data, flush_mode) {
  const strm = this.strm;
  const chunkSize = this.options.chunkSize;
  const dictionary = this.options.dictionary;
  let status, _flush_mode, last_avail_out;
  if (this.ended) return false;
  if (flush_mode === ~~flush_mode) _flush_mode = flush_mode;
  else _flush_mode = flush_mode === true ? Z_FINISH : Z_NO_FLUSH;
  if (toString.call(data) === '[object ArrayBuffer]') {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }
  strm.next_in = 0;
  strm.avail_in = strm.input.length;
  for (;;) {
    if (strm.avail_out === 0) {
      strm.output = new Uint8Array(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }
    status = inflate_1$2.inflate(strm, _flush_mode);
    if (status === Z_NEED_DICT && dictionary) {
      status = inflate_1$2.inflateSetDictionary(strm, dictionary);
      if (status === Z_OK) {
        status = inflate_1$2.inflate(strm, _flush_mode);
      } else if (status === Z_DATA_ERROR) {
        status = Z_NEED_DICT;
      }
    }
    while (strm.avail_in > 0 &&
           status === Z_STREAM_END &&
           strm.state.wrap > 0 &&
           data[strm.next_in] !== 0)
    {
      inflate_1$2.inflateReset(strm);
      status = inflate_1$2.inflate(strm, _flush_mode);
    }
    switch (status) {
      case Z_STREAM_ERROR:
      case Z_DATA_ERROR:
      case Z_NEED_DICT:
      case Z_MEM_ERROR:
        this.onEnd(status);
        this.ended = true;
        return false;
    }
    last_avail_out = strm.avail_out;
    if (strm.next_out) {
      if (strm.avail_out === 0 || status === Z_STREAM_END) {
        if (this.options.to === 'string') {
          let next_out_utf8 = strings.utf8border(strm.output, strm.next_out);
          let tail = strm.next_out - next_out_utf8;
          let utf8str = strings.buf2string(strm.output, next_out_utf8);
          strm.next_out = tail;
          strm.avail_out = chunkSize - tail;
          if (tail) strm.output.set(strm.output.subarray(next_out_utf8, next_out_utf8 + tail), 0);
          this.onData(utf8str);
        } else {
          this.onData(strm.output.length === strm.next_out ? strm.output : strm.output.subarray(0, strm.next_out));
        }
      }
    }
    if (status === Z_OK && last_avail_out === 0) continue;
    if (status === Z_STREAM_END) {
      status = inflate_1$2.inflateEnd(this.strm);
      this.onEnd(status);
      this.ended = true;
      return true;
    }
    if (strm.avail_in === 0) break;
  }
  return true;
};
Inflate$1.prototype.onData = function (chunk) {
  this.chunks.push(chunk);
};
Inflate$1.prototype.onEnd = function (status) {
  if (status === Z_OK) {
    if (this.options.to === 'string') {
      this.result = this.chunks.join('');
    } else {
      this.result = common.flattenChunks(this.chunks);
    }
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};
function inflate$1(input, options) {
  const inflator = new Inflate$1(options);
  inflator.push(input);
  if (inflator.err) throw inflator.msg || messages[inflator.err];
  return inflator.result;
}
function inflateRaw$1(input, options) {
  options = options || {};
  options.raw = true;
  return inflate$1(input, options);
}
var Inflate_1$1 = Inflate$1;
var inflate_2 = inflate$1;
var inflateRaw_1$1 = inflateRaw$1;
var ungzip$1 = inflate$1;
var inflate_1$1 = {
	Inflate: Inflate_1$1,
	inflate: inflate_2,
	inflateRaw: inflateRaw_1$1,
	ungzip: ungzip$1};
const { Deflate, deflate, deflateRaw, gzip } = deflate_1$1;
const { Inflate, inflate, inflateRaw, ungzip } = inflate_1$1;
var Deflate_1 = Deflate;
var deflate_1 = deflate;
var deflateRaw_1 = deflateRaw;
var gzip_1 = gzip;
var Inflate_1 = Inflate;
var inflate_1 = inflate;
var inflateRaw_1 = inflateRaw;
var ungzip_1 = ungzip;
var constants_1 = constants$2;
var pako = {
	Deflate: Deflate_1,
	deflate: deflate_1,
	deflateRaw: deflateRaw_1,
	gzip: gzip_1,
	Inflate: Inflate_1,
	inflate: inflate_1,
	inflateRaw: inflateRaw_1,
	ungzip: ungzip_1,
	constants: constants_1
};

globalThis.TextEncoder ??= text_minExports.TextEncoder;
(function(CompressionMethod) {
    CompressionMethod["Lz"] = "L";
    CompressionMethod["CborPako"] = "C";
    return CompressionMethod;
})({});
function compress(data) {
    const value = data.length < 512 ? `${"L"}${lzStringExports.compress(data)}` : `${"C"}${compress_cbor_pako(data)}`;
    return value;
}
function decompress(data) {
    const last = data[0];
    if (last == "L") return lzStringExports.decompress(data.slice(1));
    else if (last == "C") return decompress_cbor_pako(data.slice(1));
    else throw new Error(`Invalid compression method '${last}'. Use 1 for Lz and 2 for Cbor + Pako`);
}
 function compress_cbor_pako(data) {
    const encoded = encode(data);
    const pako_packet = pako.deflate(encoded);
    const len = Math.ceil(pako_packet.length * 0.5);
    const out = new Uint16Array(len);
    for(let i = 0, j = 0; i < len; i++, j += 2)out[i] = pako_packet[j] << 8 | (pako_packet[j + 1] ?? 0);
    return String.fromCharCode(...out);
}
 function decompress_cbor_pako(data) {
    const out = [];
    for(let i = 0, j = data.length; i < j; i++){
        const code = data.charCodeAt(i);
        out[i << 1] = code >> 8 & 0xff;
        out[(i << 1) + 1] = code & 0xff;
    }
    return decode(pako.inflate(new Uint8Array(out)));
}

var CachingOption =  function(CachingOption) {
    CachingOption[CachingOption["None"] = 0] = "None";
    CachingOption[CachingOption["Normal"] = 1] = "Normal";
    CachingOption[CachingOption["Continuous"] = 2] = "Continuous";
    return CachingOption;
}({});
function default_request_config() {
    return {
        batch: false,
        blocks: false,
        cache: 0
    };
}

function murmurhash3_32_gc(key, seed = 0) {
    var remainder, bytes, h1, h1b, c1, c2, k1, i;
    remainder = key.length & 3;
    bytes = key.length - remainder;
    h1 = seed;
    c1 = 0xcc9e2d51;
    c2 = 0x1b873593;
    i = 0;
    while(i < bytes){
        k1 = key.charCodeAt(i) & 0xff | (key.charCodeAt(++i) & 0xff) << 8 | (key.charCodeAt(++i) & 0xff) << 16 | (key.charCodeAt(++i) & 0xff) << 24;
        ++i;
        k1 = (k1 & 0xffff) * c1 + (((k1 >>> 16) * c1 & 0xffff) << 16) & 0xffffffff;
        k1 = k1 << 15 | k1 >>> 17;
        k1 = (k1 & 0xffff) * c2 + (((k1 >>> 16) * c2 & 0xffff) << 16) & 0xffffffff;
        h1 ^= k1;
        h1 = h1 << 13 | h1 >>> 19;
        h1b = (h1 & 0xffff) * 5 + (((h1 >>> 16) * 5 & 0xffff) << 16) & 0xffffffff;
        h1 = (h1b & 0xffff) + 0x6b64 + (((h1b >>> 16) + 0xe654 & 0xffff) << 16);
    }
    k1 = 0;
    switch(remainder){
        case 3:
            k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
        case 2:
            k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
        case 1:
            k1 ^= key.charCodeAt(i) & 0xff;
            k1 = (k1 & 0xffff) * c1 + (((k1 >>> 16) * c1 & 0xffff) << 16) & 0xffffffff;
            k1 = k1 << 15 | k1 >>> 17;
            k1 = (k1 & 0xffff) * c2 + (((k1 >>> 16) * c2 & 0xffff) << 16) & 0xffffffff;
            h1 ^= k1;
    }
    h1 ^= key.length;
    h1 ^= h1 >>> 16;
    h1 = (h1 & 0xffff) * 0x85ebca6b + (((h1 >>> 16) * 0x85ebca6b & 0xffff) << 16) & 0xffffffff;
    h1 ^= h1 >>> 13;
    h1 = (h1 & 0xffff) * 0xc2b2ae35 + (((h1 >>> 16) * 0xc2b2ae35 & 0xffff) << 16) & 0xffffffff;
    h1 ^= h1 >>> 16;
    return h1 >>> 0;
}

class Caching {
 constructor(){
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
 function murmur_str(hash) {
    return 'zethac:' + String.fromCharCode(hash >>> 16, hash & 0xffff);
}
class ContinuousCaching {
 constructor(){}
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

function client_id(id) {
    const hash = murmurhash3_32_gc(id);
    return String.fromCharCode(hash >>> 16 & 0xffff, hash & 0xffff);
}
 class EnchantedClient {
    constructor(config){
        this.config = config;
        this.request_idx = 0;
        this.responses = new Map;
        if (config.caching == CachingOption.Normal) this.cache = new Caching;
        else if (config.caching == CachingOption.Continuous) this.cache = new ContinuousCaching;
        this.config = config;
        this.config.uuid = client_id(this.config.uuid);
        this.batch_message = new ClientBatchMessage(config.uuid, config.target);
        system.afterEvents.scriptEventReceive.subscribe((e)=>{
            switch(e.id){
                case ResponseType.PacketData:
                    {
                        const server_message = ServerPacketMessage.from(e.message);
                        this.receive_packet(server_message);
                        break;
                    }
                case ResponseType.Finalization:
                    {
                        const message = ServerFinalizeMessage.from(e.message);
                        this.receive_finalization(message);
                        break;
                    }
                case ResponseType.BatchResponse:
                    {
                        const decompressed = decompress(e.message);
                        const message = ServerBatchedMessage.from(decompressed);
                        this.receive_batch(message);
                    }
                case ResponseType.SingleResponse:
                    {
                        const message = ServerSingleResponseMessage.from(e.message);
                        this.receive_single(message);
                    }
            }
        });
    }
 receive_single(message) {
        if (message.client_id != this.config.uuid) return false;
        const res = this.responses.get(message.request_index);
        if (!res) return false;
        const body = decompress(message.content);
        res.ok(body);
        this.responses.delete(message.request_index);
        this.handle_response(body, message.request_index);
        return true;
    }
 receive_batch(message) {
        if (message.client_id != this.config.uuid) return false;
        for (const response of message.responses){
            const res = this.responses.get(response.id);
            if (!res) continue;
            res.ok(response.body);
            this.responses.delete(response.id);
            this.handle_response(response.body, response.id);
        }
        return true;
    }
 receive_packet(message) {
        if (message.target != this.config.uuid) return false;
        this.responses.get(message.response_index).body.push(message.content);
        return true;
    }
    handle_indexed_response(index) {
        const res = this.responses.get(index);
        if (!res) return;
        const decompressed = decompress(res.body.join(""));
        res.ok(decompressed);
        this.responses.delete(index);
        this.handle_response(decompressed, index);
    }
 receive_finalization(message) {
        if (message.target != this.config.uuid) return false;
        this.handle_indexed_response(message.response_index);
        return true;
    }
 initialize_request() {
        const message = new ClientInitializationMessage(this.config.uuid, this.config.target, this.request_idx);
        system.sendScriptEvent(RequestType.Initialization, message.encode());
    }
 *make_request_nonblocking(content) {
        const compressed = compress(content);
        const id = this.request_idx;
        this.initialize_request();
        const message = new ClientPacketMessage(this.config.target, this.config.uuid, '', this.request_idx);
        this.request_idx = (this.request_idx + 1) % 4096;
        for(let i = 0, j = compressed.length; i < j;){
            message.content = compressed.substring(i, i += 2048);
            yield system.sendScriptEvent(RequestType.PacketData, message.encode());
        }
        this.finalize_request(id);
    }
 make_single_request(content) {
        console.log(this.request_idx);
        const message = new ClientSingleResquestMessage(this.config.uuid, this.config.target, this.request_idx);
        message.content = compress(content);
        system.sendScriptEvent(RequestType.SingleRequest, message.encode());
        this.request_idx = (this.request_idx + 1) % 4096;
    }
 make_request_blocking(content) {
        const compressed = compress(content);
        const id = this.request_idx;
        this.initialize_request();
        const message = new ClientPacketMessage(this.config.target, this.config.uuid, '', this.request_idx);
        this.request_idx = (this.request_idx + 1) % 4096;
        for(let i = 0, j = compressed.length; i < j;){
            message.content = compressed.substring(i, i += 2048);
            system.sendScriptEvent(RequestType.PacketData, message.encode());
        }
        this.finalize_request(id);
    }
 finalize_request(id) {
        const message = new ClientFinalizationMessage(this.config.uuid, this.config.target, id).encode();
        system.sendScriptEvent(RequestType.Finalization, message);
    }
 batch_request() {
        const encoded = this.batch_message.encode();
        const compressed = compress(encoded);
        system.sendScriptEvent(RequestType.BatchRequest, compressed);
    }
    async make_batch_request(data) {
        {
            let cached = this.cache.get(data);
            if (cached) return new Promise((ok, _)=>ok({
                    data: cached,
                    was_cached: true
                }));
        }
        if (this.batch_message.len() + data.length + 1 < 2662.4) {
            this.batch_message.add_request(data, this.request_idx);
            return new Promise((ok, _)=>{
                this.responses.set(this.request_idx, {
                    ok,
                    body: []
                });
                this.request_idx = (this.request_idx + 1) % 4096;
            }).then((e)=>{
                return {
                    data: e,
                    was_cached: false
                };
            });
        } else {
            this.batch_request();
            this.batch_message.clear();
            this.batch_message.add_request(data, this.request_idx);
            return new Promise((ok, _)=>{
                this.responses.set(this.request_idx, {
                    ok,
                    body: []
                });
                this.request_idx = (this.request_idx + 1) % 4096;
            }).then((e)=>({
                    data: e,
                    was_cached: false
                }));
        }
    }
 send_raw(data, config) {
        if (!this.config.target) return new Promise((_, err)=>err(new Error("Client does not have a target")));
        if (config.batch) return this.make_batch_request(data);
        {
            let cached = this.cache.get(data);
            if (cached) return new Promise((ok, _)=>ok({
                    data: cached,
                    was_cached: true
                }));
        }
        const out = new Promise((ok, _)=>{
            this.responses.set(this.request_idx, {
                ok,
                body: []
            });
            if (data.length > 2662.4) {
                if (config.blocks) this.make_request_blocking(data);
                else this.make_request_nonblocking(data);
            } else this.make_single_request(data);
        });
        if (config.cache) out.then((e)=>{
            this.cache.insert(data, e, config.cache);
            return {
                data: e,
                was_cached: false
            };
        });
        return out;
    }
 async send_object(obj, config = default_request_config()) {
        const data = await this.send_raw(JSON.stringify(obj), config);
        if (data.was_cached) return data.data;
        else return JSON.parse(data.data);
    }
 handle_response(content, id) {}
}

system.afterEvents.scriptEventReceive.subscribe((e)=>{
    if (!EnchantedServer.running_server) return;
    switch(e.id){
        case RequestType.Initialization:
            {
                const message = ClientInitializationMessage.from(e.message);
                EnchantedServer.running_server.receive_initialization(message);
                break;
            }
        case RequestType.PacketData:
            {
                const message = ClientPacketMessage.from(e.message);
                EnchantedServer.running_server.receive_client_packet(message);
                break;
            }
        case RequestType.Finalization:
            {
                const message = ClientFinalizationMessage.from(e.message);
                EnchantedServer.running_server.receive_client_finalization(message);
                break;
            }
        case RequestType.BatchRequest:
            {
                const decompressed_message = decompress(e.message);
                const message = ClientBatchMessage.from(decompressed_message);
                EnchantedServer.running_server.receive_client_batch(message);
                break;
            }
        case RequestType.SingleRequest:
            {
                console.log(e.message, e.message.length);
                const message = ClientSingleResquestMessage.from(e.message);
                EnchantedServer.running_server.receive_client_single(message);
            }
    }
});
class EnchantedServer extends EnchantedClient {
    static{
        this.running_server = null;
    }
    static{
        this.requests = new Map;
    }
    constructor(config){
        super(config);
        EnchantedServer.running_server ??= this;
    }
    receive_client_single(message) {
        if (message.server_id != this.config.uuid) return false;
        const decompressed = decompress(message.content);
        this.handle_request(decompressed, message.client_id, message.request_index).then((res)=>{
            const response = compress(res);
            if (response.length > 2048) send_response(response, message.client_id, message.request_index);
            else {
                const server_message = new ServerSingleResponseMessage(message.client_id, message.request_index, response);
                send_single(server_message);
            }
        });
        return true;
    }
 receive_initialization(message) {
        if (this.config.uuid != message.server_id) return false;
        const request = EnchantedServer.requests.get(message.client_id);
        if (request) request.set(message.request_index, {
            content: []
        });
        else EnchantedServer.requests.set(message.client_id, new Map([
            [
                message.request_index,
                {
                    content: []
                }
            ]
        ]));
        return true;
    }
 receive_client_packet(message) {
        if (message.server_id != this.config.uuid) return false;
        const request = EnchantedServer.requests.get(message.client_id);
        if (!request) throw new Error(`Not recognized client: ${message.client_id}`);
        request.get(message.request_index).content.push(message.content);
        return true;
    }
 receive_client_batch(message) {
        if (message.server_id != this.config.uuid) return false;
        const server_message = new ServerBatchedMessage(message.client_id);
        if (this.config.block_request) this.handle_batch_blocking(message, server_message);
        else system.runJob(this.handle_batch_nonblocking(message, server_message));
        return true;
    }
 *handle_batch_nonblocking(message, server_message) {
        for (const request of message.requests)yield void this.handle_request(request.body, message.client_id, request.id).then((response)=>{
            if (response.length + server_message.len() > 2662.4) {
                send_batch(server_message);
                server_message.reset();
            }
            server_message.add_response(response, request.id);
        });
    }
 handle_batch_blocking(message, server_message) {
        for (const request of message.requests)this.handle_request(request.body, message.client_id, request.id).then((response)=>{
            if (response.length + server_message.len() > 2662.4) {
                send_batch(server_message);
                server_message.reset();
            }
            server_message.add_response(response, request.id);
        });
    }
 receive_client_finalization(message) {
        if (this.config.uuid != message.server_id) return false;
        const request = EnchantedServer.requests.get(message.client_id);
        if (!request) throw new Error(`Not recognized client: ${message.client_id}`);
        const content = decompress(request.get(message.request_index).content.join(''));
        this.handle_request(content, message.client_id, message.request_index).then((response)=>{
            if (this.config.block_request) send_response(compress(response), message.client_id, message.request_index);
            else send_response_blocking(compress(response), message.client_id, message.request_index);
            request.delete(message.request_index);
        });
        return true;
    }
    async handle_request(req, client, req_id) {
        const data = this.handle(JSON.parse(req), client, req_id);
        return JSON.stringify(data);
    }
    async handle(obj, client, req_id) {
        return "Todo! Enchanted Server default handle function is meant to be overwritten";
    }
}

class ErrorHandler {
    handle(e) {
        return Response.InternalError(e.message);
    }
}
class RouteServer extends EnchantedServer {
    constructor(config){
        super(config), this.inner = new src_default(), this.accept_all = false, this.accepted_clients = new Set(), this.error_handler = new ErrorHandler;
        this.config = config;
    }
    configure(config) {
        if (config.accepted_clients == "*") this.accept_all = true;
        else config.accepted_clients.forEach((client)=>this.accepted_clients.add(client));
    }
    route(route, fn) {
        this.inner.add('GET', route, fn);
        return this;
    }
    async handle(obj, target, id) {
        const handler = this.inner.find('GET', obj.route);
        if (handler == null) return Response.NotFound(`Route '${obj.route}' was not found!`);
        try {
            const result = handler.store(obj.content, handler.params, target, id);
            return result instanceof Promise ? result.then((e)=>typeof e != 'object' ? Response.Success(e) : e).catch((e)=>this.error_handler.handle(e)) : typeof result != 'object' ? Response.Success(result) : result;
        } catch (e) {
            return this.error_handler.handle(e);
        }
    }
 use_controller(controller) {
        const controller_instance = new controller();
        let controller_route = controller_instance.route;
        if (controller_route == null) for (const [route, handler] of Object.entries(controller_instance[ROUTES_KEY]))this.route(route, handler.bind(controller_instance));
        else {
            if (controller_route.endsWith("/")) controller_route = controller_route.slice(0, -1);
            for (let [route, handler] of Object.entries(controller_instance[ROUTES_KEY])){
                if (route[0] == "/") route = route.slice(1);
                this.route(controller_route + "/" + route, handler.bind(controller_instance));
            }
        }
    }
    async handle_request(req, client, req_id) {
        if (!this.accept_all && !this.accepted_clients.has(client)) return Response.Stringify(Response.NotEnoughPermission("Client not able to do requests to this server"));
        return this.handle(JSON.parse(req), client, req_id).then(JSON.stringify);
    }
}
class RouteServerController {
    constructor(route){
        this.route = route;
    }
}

function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
system.run(()=>world.setDynamicProperty('suamae', 'é muito legal cara, amo ela'));
class MainController extends RouteServerController {
    f(body, params) {
        return Response.Success({
            value: world.getDynamicProperty('suamae'),
            prop: 'suamae'
        });
    }
    constructor(...args){
        super(...args), this.id = 0;
    }
}
_ts_decorate([
    Route("/example/:id")
], MainController.prototype, "f", null);
const server = new RouteServer({
    uuid: "cycro:zetha_server"
});
server.use_controller(MainController);
server.configure({
    accepted_clients: '*'
});
