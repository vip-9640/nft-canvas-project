var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports, require("@solana/wallet-adapter-base"), require("vue"), require("@solana/web3.js"), require("@vueuse/core")) : typeof define === "function" && define.amd ? define(["exports", "@solana/wallet-adapter-base", "vue", "@solana/web3.js", "@vueuse/core"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global["solana-wallets-vue"] = {}, global.SolanaWalletAdapterBase, global.Vue, global.SolanaWeb3, global.VueUseCore));
})(this, function(exports2, walletAdapterBase, vue, web3_js, core) {
  "use strict";
  class WalletNotSelectedError extends walletAdapterBase.WalletError {
    constructor() {
      super(...arguments);
      __publicField(this, "name", "WalletNotSelectedError");
    }
  }
  class WalletNotInitializedError extends walletAdapterBase.WalletError {
    constructor() {
      super(...arguments);
      __publicField(this, "name", "WalletNotSelectedError");
    }
  }
  const SolanaMobileWalletAdapterErrorCode = {
    ERROR_ASSOCIATION_PORT_OUT_OF_RANGE: "ERROR_ASSOCIATION_PORT_OUT_OF_RANGE",
    ERROR_FORBIDDEN_WALLET_BASE_URL: "ERROR_FORBIDDEN_WALLET_BASE_URL",
    ERROR_SECURE_CONTEXT_REQUIRED: "ERROR_SECURE_CONTEXT_REQUIRED",
    ERROR_SESSION_CLOSED: "ERROR_SESSION_CLOSED",
    ERROR_SESSION_TIMEOUT: "ERROR_SESSION_TIMEOUT",
    ERROR_WALLET_NOT_FOUND: "ERROR_WALLET_NOT_FOUND"
  };
  class SolanaMobileWalletAdapterError extends Error {
    constructor(...args) {
      const [code2, message, data] = args;
      super(message);
      this.code = code2;
      this.data = data;
      this.name = "SolanaMobileWalletAdapterError";
    }
  }
  class SolanaMobileWalletAdapterProtocolError extends Error {
    constructor(...args) {
      const [jsonRpcMessageId, code2, message, data] = args;
      super(message);
      this.code = code2;
      this.data = data;
      this.jsonRpcMessageId = jsonRpcMessageId;
      this.name = "SolanaMobileWalletAdapterProtocolError";
    }
  }
  function __awaiter$2(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  }
  function createHelloReq(ecdhPublicKey, associationKeypairPrivateKey) {
    return __awaiter$2(this, void 0, void 0, function* () {
      const publicKeyBuffer = yield crypto.subtle.exportKey("raw", ecdhPublicKey);
      const signatureBuffer = yield crypto.subtle.sign({ hash: "SHA-256", name: "ECDSA" }, associationKeypairPrivateKey, publicKeyBuffer);
      const response = new Uint8Array(publicKeyBuffer.byteLength + signatureBuffer.byteLength);
      response.set(new Uint8Array(publicKeyBuffer), 0);
      response.set(new Uint8Array(signatureBuffer), publicKeyBuffer.byteLength);
      return response;
    });
  }
  const SEQUENCE_NUMBER_BYTES = 4;
  function createSequenceNumberVector(sequenceNumber) {
    if (sequenceNumber >= 4294967296) {
      throw new Error("Outbound sequence number overflow. The maximum sequence number is 32-bytes.");
    }
    const byteArray = new ArrayBuffer(SEQUENCE_NUMBER_BYTES);
    const view = new DataView(byteArray);
    view.setUint32(0, sequenceNumber, false);
    return new Uint8Array(byteArray);
  }
  function generateAssociationKeypair() {
    return __awaiter$2(this, void 0, void 0, function* () {
      return yield crypto.subtle.generateKey({
        name: "ECDSA",
        namedCurve: "P-256"
      }, false, ["sign"]);
    });
  }
  function generateECDHKeypair() {
    return __awaiter$2(this, void 0, void 0, function* () {
      return yield crypto.subtle.generateKey({
        name: "ECDH",
        namedCurve: "P-256"
      }, false, ["deriveKey", "deriveBits"]);
    });
  }
  const INITIALIZATION_VECTOR_BYTES = 12;
  function encryptJsonRpcMessage(jsonRpcMessage, sharedSecret) {
    return __awaiter$2(this, void 0, void 0, function* () {
      const plaintext = JSON.stringify(jsonRpcMessage);
      const sequenceNumberVector = createSequenceNumberVector(jsonRpcMessage.id);
      const initializationVector = new Uint8Array(INITIALIZATION_VECTOR_BYTES);
      crypto.getRandomValues(initializationVector);
      const ciphertext = yield crypto.subtle.encrypt(getAlgorithmParams(sequenceNumberVector, initializationVector), sharedSecret, new TextEncoder().encode(plaintext));
      const response = new Uint8Array(sequenceNumberVector.byteLength + initializationVector.byteLength + ciphertext.byteLength);
      response.set(new Uint8Array(sequenceNumberVector), 0);
      response.set(new Uint8Array(initializationVector), sequenceNumberVector.byteLength);
      response.set(new Uint8Array(ciphertext), sequenceNumberVector.byteLength + initializationVector.byteLength);
      return response;
    });
  }
  function decryptJsonRpcMessage(message, sharedSecret) {
    return __awaiter$2(this, void 0, void 0, function* () {
      const sequenceNumberVector = message.slice(0, SEQUENCE_NUMBER_BYTES);
      const initializationVector = message.slice(SEQUENCE_NUMBER_BYTES, SEQUENCE_NUMBER_BYTES + INITIALIZATION_VECTOR_BYTES);
      const ciphertext = message.slice(SEQUENCE_NUMBER_BYTES + INITIALIZATION_VECTOR_BYTES);
      const plaintextBuffer = yield crypto.subtle.decrypt(getAlgorithmParams(sequenceNumberVector, initializationVector), sharedSecret, ciphertext);
      const plaintext = getUtf8Decoder().decode(plaintextBuffer);
      const jsonRpcMessage = JSON.parse(plaintext);
      if (Object.hasOwnProperty.call(jsonRpcMessage, "error")) {
        throw new SolanaMobileWalletAdapterProtocolError(jsonRpcMessage.id, jsonRpcMessage.error.code, jsonRpcMessage.error.message);
      }
      return jsonRpcMessage;
    });
  }
  function getAlgorithmParams(sequenceNumber, initializationVector) {
    return {
      additionalData: sequenceNumber,
      iv: initializationVector,
      name: "AES-GCM",
      tagLength: 128
    };
  }
  let _utf8Decoder;
  function getUtf8Decoder() {
    if (_utf8Decoder === void 0) {
      _utf8Decoder = new TextDecoder("utf-8");
    }
    return _utf8Decoder;
  }
  function parseHelloRsp(payloadBuffer, associationPublicKey, ecdhPrivateKey) {
    return __awaiter$2(this, void 0, void 0, function* () {
      const [associationPublicKeyBuffer, walletPublicKey] = yield Promise.all([
        crypto.subtle.exportKey("raw", associationPublicKey),
        crypto.subtle.importKey("raw", payloadBuffer, { name: "ECDH", namedCurve: "P-256" }, false, [])
      ]);
      const sharedSecret = yield crypto.subtle.deriveBits({ name: "ECDH", public: walletPublicKey }, ecdhPrivateKey, 256);
      const ecdhSecretKey = yield crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveKey"]);
      const aesKeyMaterialVal = yield crypto.subtle.deriveKey({
        name: "HKDF",
        hash: "SHA-256",
        salt: new Uint8Array(associationPublicKeyBuffer),
        info: new Uint8Array()
      }, ecdhSecretKey, { name: "AES-GCM", length: 128 }, false, ["encrypt", "decrypt"]);
      return aesKeyMaterialVal;
    });
  }
  function getRandomAssociationPort() {
    return assertAssociationPort(49152 + Math.floor(Math.random() * (65535 - 49152 + 1)));
  }
  function assertAssociationPort(port) {
    if (port < 49152 || port > 65535) {
      throw new SolanaMobileWalletAdapterError(SolanaMobileWalletAdapterErrorCode.ERROR_ASSOCIATION_PORT_OUT_OF_RANGE, `Association port number must be between 49152 and 65535. ${port} given.`, { port });
    }
    return port;
  }
  function arrayBufferToBase64String(buffer2) {
    let binary = "";
    const bytes = new Uint8Array(buffer2);
    const len2 = bytes.byteLength;
    for (let ii = 0; ii < len2; ii++) {
      binary += String.fromCharCode(bytes[ii]);
    }
    return window.btoa(binary);
  }
  function getStringWithURLUnsafeCharactersReplaced(unsafeBase64EncodedString) {
    return unsafeBase64EncodedString.replace(/[/+=]/g, (m) => ({
      "/": "_",
      "+": "-",
      "=": "."
    })[m]);
  }
  const INTENT_NAME = "solana-wallet";
  function getPathParts(pathString) {
    return pathString.replace(/(^\/+|\/+$)/g, "").split("/");
  }
  function getIntentURL(methodPathname, intentUrlBase) {
    let baseUrl = null;
    if (intentUrlBase) {
      try {
        baseUrl = new URL(intentUrlBase);
      } catch (_a) {
      }
      if ((baseUrl === null || baseUrl === void 0 ? void 0 : baseUrl.protocol) !== "https:") {
        throw new SolanaMobileWalletAdapterError(SolanaMobileWalletAdapterErrorCode.ERROR_FORBIDDEN_WALLET_BASE_URL, "Base URLs supplied by wallets must be valid `https` URLs");
      }
    }
    baseUrl || (baseUrl = new URL(`${INTENT_NAME}:/`));
    const pathname = methodPathname.startsWith("/") ? methodPathname : [...getPathParts(baseUrl.pathname), ...getPathParts(methodPathname)].join("/");
    return new URL(pathname, baseUrl);
  }
  function getAssociateAndroidIntentURL(associationPublicKey, putativePort, associationURLBase) {
    return __awaiter$2(this, void 0, void 0, function* () {
      const associationPort = assertAssociationPort(putativePort);
      const exportedKey = yield crypto.subtle.exportKey("raw", associationPublicKey);
      const encodedKey = arrayBufferToBase64String(exportedKey);
      const url = getIntentURL("v1/associate/local", associationURLBase);
      url.searchParams.set("association", getStringWithURLUnsafeCharactersReplaced(encodedKey));
      url.searchParams.set("port", `${associationPort}`);
      return url;
    });
  }
  const Browser = {
    Firefox: 0,
    Other: 1
  };
  function assertUnreachable(x) {
    return x;
  }
  function getBrowser() {
    return navigator.userAgent.indexOf("Firefox/") !== -1 ? Browser.Firefox : Browser.Other;
  }
  function getDetectionPromise() {
    return new Promise((resolve, reject) => {
      function cleanup() {
        clearTimeout(timeoutId);
        window.removeEventListener("blur", handleBlur);
      }
      function handleBlur() {
        cleanup();
        resolve();
      }
      window.addEventListener("blur", handleBlur);
      const timeoutId = setTimeout(() => {
        cleanup();
        reject();
      }, 2e3);
    });
  }
  let _frame = null;
  function launchUrlThroughHiddenFrame(url) {
    if (_frame == null) {
      _frame = document.createElement("iframe");
      _frame.style.display = "none";
      document.body.appendChild(_frame);
    }
    _frame.contentWindow.location.href = url.toString();
  }
  function startSession(associationPublicKey, associationURLBase) {
    return __awaiter$2(this, void 0, void 0, function* () {
      const randomAssociationPort = getRandomAssociationPort();
      const associationUrl = yield getAssociateAndroidIntentURL(associationPublicKey, randomAssociationPort, associationURLBase);
      if (associationUrl.protocol === "https:") {
        window.location.assign(associationUrl);
      } else {
        try {
          const browser = getBrowser();
          switch (browser) {
            case Browser.Firefox:
              launchUrlThroughHiddenFrame(associationUrl);
              break;
            case Browser.Other: {
              const detectionPromise = getDetectionPromise();
              window.location.assign(associationUrl);
              yield detectionPromise;
              break;
            }
            default:
              assertUnreachable(browser);
          }
        } catch (e) {
          throw new SolanaMobileWalletAdapterError(SolanaMobileWalletAdapterErrorCode.ERROR_WALLET_NOT_FOUND, "Found no installed wallet that supports the mobile wallet protocol.");
        }
      }
      return randomAssociationPort;
    });
  }
  const WEBSOCKET_CONNECTION_CONFIG = {
    retryDelayScheduleMs: [150, 150, 200, 500, 500, 750, 750, 1e3],
    timeoutMs: 3e4
  };
  const WEBSOCKET_PROTOCOL = "com.solana.mobilewalletadapter.v1";
  function assertSecureContext() {
    if (typeof window === "undefined" || window.isSecureContext !== true) {
      throw new SolanaMobileWalletAdapterError(SolanaMobileWalletAdapterErrorCode.ERROR_SECURE_CONTEXT_REQUIRED, "The mobile wallet adapter protocol must be used in a secure context (`https`).");
    }
  }
  function assertSecureEndpointSpecificURI(walletUriBase) {
    let url;
    try {
      url = new URL(walletUriBase);
    } catch (_a) {
      throw new SolanaMobileWalletAdapterError(SolanaMobileWalletAdapterErrorCode.ERROR_FORBIDDEN_WALLET_BASE_URL, "Invalid base URL supplied by wallet");
    }
    if (url.protocol !== "https:") {
      throw new SolanaMobileWalletAdapterError(SolanaMobileWalletAdapterErrorCode.ERROR_FORBIDDEN_WALLET_BASE_URL, "Base URLs supplied by wallets must be valid `https` URLs");
    }
  }
  function getSequenceNumberFromByteArray(byteArray) {
    const view = new DataView(byteArray);
    return view.getUint32(0, false);
  }
  function transact$1(callback, config) {
    return __awaiter$2(this, void 0, void 0, function* () {
      assertSecureContext();
      const associationKeypair = yield generateAssociationKeypair();
      const sessionPort = yield startSession(associationKeypair.publicKey, config === null || config === void 0 ? void 0 : config.baseUri);
      const websocketURL = `ws://localhost:${sessionPort}/solana-wallet`;
      let connectionStartTime;
      const getNextRetryDelayMs = (() => {
        const schedule = [...WEBSOCKET_CONNECTION_CONFIG.retryDelayScheduleMs];
        return () => schedule.length > 1 ? schedule.shift() : schedule[0];
      })();
      let nextJsonRpcMessageId = 1;
      let lastKnownInboundSequenceNumber = 0;
      let state = { __type: "disconnected" };
      return new Promise((resolve, reject) => {
        let socket;
        const jsonRpcResponsePromises = {};
        const handleOpen = () => __awaiter$2(this, void 0, void 0, function* () {
          if (state.__type !== "connecting") {
            console.warn(`Expected adapter state to be \`connecting\` at the moment the websocket opens. Got \`${state.__type}\`.`);
            return;
          }
          const { associationKeypair: associationKeypair2 } = state;
          socket.removeEventListener("open", handleOpen);
          const ecdhKeypair = yield generateECDHKeypair();
          socket.send(yield createHelloReq(ecdhKeypair.publicKey, associationKeypair2.privateKey));
          state = {
            __type: "hello_req_sent",
            associationPublicKey: associationKeypair2.publicKey,
            ecdhPrivateKey: ecdhKeypair.privateKey
          };
        });
        const handleClose = (evt) => {
          if (evt.wasClean) {
            state = { __type: "disconnected" };
          } else {
            reject(new SolanaMobileWalletAdapterError(SolanaMobileWalletAdapterErrorCode.ERROR_SESSION_CLOSED, `The wallet session dropped unexpectedly (${evt.code}: ${evt.reason}).`, { closeEvent: evt }));
          }
          disposeSocket();
        };
        const handleError = (_evt) => __awaiter$2(this, void 0, void 0, function* () {
          disposeSocket();
          if (Date.now() - connectionStartTime >= WEBSOCKET_CONNECTION_CONFIG.timeoutMs) {
            reject(new SolanaMobileWalletAdapterError(SolanaMobileWalletAdapterErrorCode.ERROR_SESSION_TIMEOUT, `Failed to connect to the wallet websocket on port ${sessionPort}.`));
          } else {
            yield new Promise((resolve2) => {
              const retryDelayMs = getNextRetryDelayMs();
              retryWaitTimeoutId = window.setTimeout(resolve2, retryDelayMs);
            });
            attemptSocketConnection();
          }
        });
        const handleMessage = (evt) => __awaiter$2(this, void 0, void 0, function* () {
          const responseBuffer = yield evt.data.arrayBuffer();
          switch (state.__type) {
            case "connected":
              try {
                const sequenceNumberVector = responseBuffer.slice(0, SEQUENCE_NUMBER_BYTES);
                const sequenceNumber = getSequenceNumberFromByteArray(sequenceNumberVector);
                if (sequenceNumber !== lastKnownInboundSequenceNumber + 1) {
                  throw new Error("Encrypted message has invalid sequence number");
                }
                lastKnownInboundSequenceNumber = sequenceNumber;
                const jsonRpcMessage = yield decryptJsonRpcMessage(responseBuffer, state.sharedSecret);
                const responsePromise = jsonRpcResponsePromises[jsonRpcMessage.id];
                delete jsonRpcResponsePromises[jsonRpcMessage.id];
                responsePromise.resolve(jsonRpcMessage.result);
              } catch (e) {
                if (e instanceof SolanaMobileWalletAdapterProtocolError) {
                  const responsePromise = jsonRpcResponsePromises[e.jsonRpcMessageId];
                  delete jsonRpcResponsePromises[e.jsonRpcMessageId];
                  responsePromise.reject(e);
                } else {
                  throw e;
                }
              }
              break;
            case "hello_req_sent": {
              const sharedSecret = yield parseHelloRsp(responseBuffer, state.associationPublicKey, state.ecdhPrivateKey);
              state = { __type: "connected", sharedSecret };
              const wallet = new Proxy({}, {
                get(target, p) {
                  if (target[p] == null) {
                    const method = p.toString().replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).toLowerCase();
                    target[p] = function(params) {
                      return __awaiter$2(this, void 0, void 0, function* () {
                        const id = nextJsonRpcMessageId++;
                        socket.send(yield encryptJsonRpcMessage({
                          id,
                          jsonrpc: "2.0",
                          method,
                          params: params !== null && params !== void 0 ? params : {}
                        }, sharedSecret));
                        return new Promise((resolve2, reject2) => {
                          jsonRpcResponsePromises[id] = {
                            resolve(result) {
                              switch (p) {
                                case "authorize":
                                case "reauthorize": {
                                  const { wallet_uri_base } = result;
                                  if (wallet_uri_base != null) {
                                    try {
                                      assertSecureEndpointSpecificURI(wallet_uri_base);
                                    } catch (e) {
                                      reject2(e);
                                      return;
                                    }
                                  }
                                  break;
                                }
                              }
                              resolve2(result);
                            },
                            reject: reject2
                          };
                        });
                      });
                    };
                  }
                  return target[p];
                },
                defineProperty() {
                  return false;
                },
                deleteProperty() {
                  return false;
                }
              });
              try {
                resolve(yield callback(wallet));
              } catch (e) {
                reject(e);
              } finally {
                disposeSocket();
                socket.close();
              }
              break;
            }
          }
        });
        let disposeSocket;
        let retryWaitTimeoutId;
        const attemptSocketConnection = () => {
          if (disposeSocket) {
            disposeSocket();
          }
          state = { __type: "connecting", associationKeypair };
          if (connectionStartTime === void 0) {
            connectionStartTime = Date.now();
          }
          socket = new WebSocket(websocketURL, [WEBSOCKET_PROTOCOL]);
          socket.addEventListener("open", handleOpen);
          socket.addEventListener("close", handleClose);
          socket.addEventListener("error", handleError);
          socket.addEventListener("message", handleMessage);
          disposeSocket = () => {
            window.clearTimeout(retryWaitTimeoutId);
            socket.removeEventListener("open", handleOpen);
            socket.removeEventListener("close", handleClose);
            socket.removeEventListener("error", handleError);
            socket.removeEventListener("message", handleMessage);
          };
        };
        attemptSocketConnection();
      });
    });
  }
  function base$1(ALPHABET2) {
    if (ALPHABET2.length >= 255) {
      throw new TypeError("Alphabet too long");
    }
    var BASE_MAP = new Uint8Array(256);
    for (var j = 0; j < BASE_MAP.length; j++) {
      BASE_MAP[j] = 255;
    }
    for (var i2 = 0; i2 < ALPHABET2.length; i2++) {
      var x = ALPHABET2.charAt(i2);
      var xc = x.charCodeAt(0);
      if (BASE_MAP[xc] !== 255) {
        throw new TypeError(x + " is ambiguous");
      }
      BASE_MAP[xc] = i2;
    }
    var BASE = ALPHABET2.length;
    var LEADER = ALPHABET2.charAt(0);
    var FACTOR = Math.log(BASE) / Math.log(256);
    var iFACTOR = Math.log(256) / Math.log(BASE);
    function encode(source) {
      if (source instanceof Uint8Array)
        ;
      else if (ArrayBuffer.isView(source)) {
        source = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
      } else if (Array.isArray(source)) {
        source = Uint8Array.from(source);
      }
      if (!(source instanceof Uint8Array)) {
        throw new TypeError("Expected Uint8Array");
      }
      if (source.length === 0) {
        return "";
      }
      var zeroes = 0;
      var length = 0;
      var pbegin = 0;
      var pend = source.length;
      while (pbegin !== pend && source[pbegin] === 0) {
        pbegin++;
        zeroes++;
      }
      var size = (pend - pbegin) * iFACTOR + 1 >>> 0;
      var b58 = new Uint8Array(size);
      while (pbegin !== pend) {
        var carry = source[pbegin];
        var i3 = 0;
        for (var it1 = size - 1; (carry !== 0 || i3 < length) && it1 !== -1; it1--, i3++) {
          carry += 256 * b58[it1] >>> 0;
          b58[it1] = carry % BASE >>> 0;
          carry = carry / BASE >>> 0;
        }
        if (carry !== 0) {
          throw new Error("Non-zero carry");
        }
        length = i3;
        pbegin++;
      }
      var it2 = size - length;
      while (it2 !== size && b58[it2] === 0) {
        it2++;
      }
      var str = LEADER.repeat(zeroes);
      for (; it2 < size; ++it2) {
        str += ALPHABET2.charAt(b58[it2]);
      }
      return str;
    }
    function decodeUnsafe(source) {
      if (typeof source !== "string") {
        throw new TypeError("Expected String");
      }
      if (source.length === 0) {
        return new Uint8Array();
      }
      var psz = 0;
      var zeroes = 0;
      var length = 0;
      while (source[psz] === LEADER) {
        zeroes++;
        psz++;
      }
      var size = (source.length - psz) * FACTOR + 1 >>> 0;
      var b256 = new Uint8Array(size);
      while (source[psz]) {
        var carry = BASE_MAP[source.charCodeAt(psz)];
        if (carry === 255) {
          return;
        }
        var i3 = 0;
        for (var it3 = size - 1; (carry !== 0 || i3 < length) && it3 !== -1; it3--, i3++) {
          carry += BASE * b256[it3] >>> 0;
          b256[it3] = carry % 256 >>> 0;
          carry = carry / 256 >>> 0;
        }
        if (carry !== 0) {
          throw new Error("Non-zero carry");
        }
        length = i3;
        psz++;
      }
      var it4 = size - length;
      while (it4 !== size && b256[it4] === 0) {
        it4++;
      }
      var vch = new Uint8Array(zeroes + (size - it4));
      var j2 = zeroes;
      while (it4 !== size) {
        vch[j2++] = b256[it4++];
      }
      return vch;
    }
    function decode(string) {
      var buffer2 = decodeUnsafe(string);
      if (buffer2) {
        return buffer2;
      }
      throw new Error("Non-base" + BASE + " character");
    }
    return {
      encode,
      decodeUnsafe,
      decode
    };
  }
  var src$1 = base$1;
  const basex$1 = src$1;
  const ALPHABET$1 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  var bs58$1 = basex$1(ALPHABET$1);
  function __rest(s, e) {
    var t = {};
    for (var p in s)
      if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
      for (var i2 = 0, p = Object.getOwnPropertySymbols(s); i2 < p.length; i2++) {
        if (e.indexOf(p[i2]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i2]))
          t[p[i2]] = s[p[i2]];
      }
    return t;
  }
  function __awaiter$1(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  }
  function fromUint8Array(byteArray) {
    return window.btoa(String.fromCharCode.call(null, ...byteArray));
  }
  function toUint8Array$1(base64EncodedByteArray) {
    return new Uint8Array(window.atob(base64EncodedByteArray).split("").map((c) => c.charCodeAt(0)));
  }
  function getPayloadFromTransaction(transaction) {
    const serializedTransaction = "version" in transaction ? transaction.serialize() : transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });
    const payload = fromUint8Array(serializedTransaction);
    return payload;
  }
  function getTransactionFromWireMessage(byteArray) {
    const numSignatures = byteArray[0];
    const messageOffset = numSignatures * web3_js.SIGNATURE_LENGTH_IN_BYTES + 1;
    const version = web3_js.VersionedMessage.deserializeMessageVersion(byteArray.slice(messageOffset, byteArray.length));
    if (version === "legacy") {
      return web3_js.Transaction.from(byteArray);
    } else {
      return web3_js.VersionedTransaction.deserialize(byteArray);
    }
  }
  function transact(callback, config) {
    return __awaiter$1(this, void 0, void 0, function* () {
      const augmentedCallback = (wallet) => {
        const augmentedAPI = new Proxy({}, {
          get(target, p) {
            if (target[p] == null) {
              switch (p) {
                case "signAndSendTransactions":
                  target[p] = function(_a) {
                    var { minContextSlot, transactions } = _a, rest = __rest(_a, ["minContextSlot", "transactions"]);
                    return __awaiter$1(this, void 0, void 0, function* () {
                      const payloads = transactions.map(getPayloadFromTransaction);
                      const { signatures: base64EncodedSignatures } = yield wallet.signAndSendTransactions(Object.assign(Object.assign(Object.assign({}, rest), minContextSlot != null ? { options: { min_context_slot: minContextSlot } } : null), { payloads }));
                      const signatures = base64EncodedSignatures.map(toUint8Array$1).map(bs58$1.encode);
                      return signatures;
                    });
                  };
                  break;
                case "signMessages":
                  target[p] = function(_a) {
                    var { payloads } = _a, rest = __rest(_a, ["payloads"]);
                    return __awaiter$1(this, void 0, void 0, function* () {
                      const base64EncodedPayloads = payloads.map(fromUint8Array);
                      const { signed_payloads: base64EncodedSignedMessages } = yield wallet.signMessages(Object.assign(Object.assign({}, rest), { payloads: base64EncodedPayloads }));
                      const signedMessages = base64EncodedSignedMessages.map(toUint8Array$1);
                      return signedMessages;
                    });
                  };
                  break;
                case "signTransactions":
                  target[p] = function(_a) {
                    var { transactions } = _a, rest = __rest(_a, ["transactions"]);
                    return __awaiter$1(this, void 0, void 0, function* () {
                      const payloads = transactions.map(getPayloadFromTransaction);
                      const { signed_payloads: base64EncodedCompiledTransactions } = yield wallet.signTransactions(Object.assign(Object.assign({}, rest), { payloads }));
                      const compiledTransactions = base64EncodedCompiledTransactions.map(toUint8Array$1);
                      const signedTransactions = compiledTransactions.map(getTransactionFromWireMessage);
                      return signedTransactions;
                    });
                  };
                  break;
                default: {
                  target[p] = wallet[p];
                  break;
                }
              }
            }
            return target[p];
          },
          defineProperty() {
            return false;
          },
          deleteProperty() {
            return false;
          }
        });
        return callback(augmentedAPI);
      };
      return yield transact$1(augmentedCallback, config);
    });
  }
  function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  }
  function toUint8Array(base64EncodedByteArray) {
    return new Uint8Array(window.atob(base64EncodedByteArray).split("").map((c) => c.charCodeAt(0)));
  }
  function getIsSupported() {
    return typeof window !== "undefined" && window.isSecureContext && typeof document !== "undefined" && /android/i.test(navigator.userAgent);
  }
  const SolanaMobileWalletAdapterWalletName = "Mobile Wallet Adapter";
  const SIGNATURE_LENGTH_IN_BYTES = 64;
  function getPublicKeyFromAddress(address) {
    const publicKeyByteArray = toUint8Array(address);
    return new web3_js.PublicKey(publicKeyByteArray);
  }
  function isVersionedTransaction$1(transaction) {
    return "version" in transaction;
  }
  class SolanaMobileWalletAdapter extends walletAdapterBase.BaseMessageSignerWalletAdapter {
    constructor(config) {
      super();
      this.supportedTransactionVersions = /* @__PURE__ */ new Set(
        ["legacy", 0]
      );
      this.name = SolanaMobileWalletAdapterWalletName;
      this.url = "https://solanamobile.com/wallets";
      this.icon = "data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI4IiB3aWR0aD0iMjgiIHZpZXdCb3g9Ii0zIDAgMjggMjgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0iI0RDQjhGRiI+PHBhdGggZD0iTTE3LjQgMTcuNEgxNXYyLjRoMi40di0yLjRabTEuMi05LjZoLTIuNHYyLjRoMi40VjcuOFoiLz48cGF0aCBkPSJNMjEuNiAzVjBoLTIuNHYzaC0zLjZWMGgtMi40djNoLTIuNHY2LjZINC41YTIuMSAyLjEgMCAxIDEgMC00LjJoMi43VjNINC41QTQuNSA0LjUgMCAwIDAgMCA3LjVWMjRoMjEuNnYtNi42aC0yLjR2NC4ySDIuNFYxMS41Yy41LjMgMS4yLjQgMS44LjVoNy41QTYuNiA2LjYgMCAwIDAgMjQgOVYzaC0yLjRabTAgNS43YTQuMiA0LjIgMCAxIDEtOC40IDBWNS40aDguNHYzLjNaIi8+PC9nPjwvc3ZnPg==";
      this._connecting = false;
      this._connectionGeneration = 0;
      this._readyState = getIsSupported() ? walletAdapterBase.WalletReadyState.Loadable : walletAdapterBase.WalletReadyState.Unsupported;
      this._authorizationResultCache = config.authorizationResultCache;
      this._addressSelector = config.addressSelector;
      this._appIdentity = config.appIdentity;
      this._cluster = config.cluster;
      this._onWalletNotFound = config.onWalletNotFound;
      if (this._readyState !== walletAdapterBase.WalletReadyState.Unsupported) {
        this._authorizationResultCache.get().then((authorizationResult) => {
          if (authorizationResult) {
            this.declareWalletAsInstalled();
          }
        });
      }
    }
    get publicKey() {
      if (this._publicKey == null && this._selectedAddress != null) {
        try {
          this._publicKey = getPublicKeyFromAddress(this._selectedAddress);
        } catch (e) {
          throw new walletAdapterBase.WalletPublicKeyError(e instanceof Error && (e === null || e === void 0 ? void 0 : e.message) || "Unknown error", e);
        }
      }
      return this._publicKey ? this._publicKey : null;
    }
    get connected() {
      return !!this._authorizationResult;
    }
    get connecting() {
      return this._connecting;
    }
    get readyState() {
      return this._readyState;
    }
    declareWalletAsInstalled() {
      if (this._readyState !== walletAdapterBase.WalletReadyState.Installed) {
        this.emit("readyStateChange", this._readyState = walletAdapterBase.WalletReadyState.Installed);
      }
    }
    runWithGuard(callback) {
      return __awaiter(this, void 0, void 0, function* () {
        try {
          return yield callback();
        } catch (e) {
          this.emit("error", e);
          throw e;
        }
      });
    }
    autoConnect_DO_NOT_USE_OR_YOU_WILL_BE_FIRED() {
      return __awaiter(this, void 0, void 0, function* () {
        return yield this.autoConnect();
      });
    }
    autoConnect() {
      return __awaiter(this, void 0, void 0, function* () {
        if (this.connecting || this.connected) {
          return;
        }
        return yield this.runWithGuard(() => __awaiter(this, void 0, void 0, function* () {
          if (this._readyState !== walletAdapterBase.WalletReadyState.Installed && this._readyState !== walletAdapterBase.WalletReadyState.Loadable) {
            throw new walletAdapterBase.WalletNotReadyError();
          }
          this._connecting = true;
          try {
            const cachedAuthorizationResult = yield this._authorizationResultCache.get();
            if (cachedAuthorizationResult) {
              this.handleAuthorizationResult(cachedAuthorizationResult);
            }
          } catch (e) {
            throw new walletAdapterBase.WalletConnectionError(e instanceof Error && e.message || "Unknown error", e);
          } finally {
            this._connecting = false;
          }
        }));
      });
    }
    connect() {
      return __awaiter(this, void 0, void 0, function* () {
        if (this.connecting || this.connected) {
          return;
        }
        return yield this.runWithGuard(() => __awaiter(this, void 0, void 0, function* () {
          if (this._readyState !== walletAdapterBase.WalletReadyState.Installed && this._readyState !== walletAdapterBase.WalletReadyState.Loadable) {
            throw new walletAdapterBase.WalletNotReadyError();
          }
          this._connecting = true;
          try {
            const cachedAuthorizationResult = yield this._authorizationResultCache.get();
            if (cachedAuthorizationResult) {
              this.handleAuthorizationResult(cachedAuthorizationResult);
              return;
            }
            yield this.transact((wallet) => __awaiter(this, void 0, void 0, function* () {
              const authorizationResult = yield wallet.authorize({
                cluster: this._cluster,
                identity: this._appIdentity
              });
              Promise.all([
                this._authorizationResultCache.set(authorizationResult),
                this.handleAuthorizationResult(authorizationResult)
              ]);
            }));
          } catch (e) {
            throw new walletAdapterBase.WalletConnectionError(e instanceof Error && e.message || "Unknown error", e);
          } finally {
            this._connecting = false;
          }
        }));
      });
    }
    handleAuthorizationResult(authorizationResult) {
      var _a;
      return __awaiter(this, void 0, void 0, function* () {
        const didPublicKeysChange = this._authorizationResult == null || ((_a = this._authorizationResult) === null || _a === void 0 ? void 0 : _a.accounts.length) !== authorizationResult.accounts.length || this._authorizationResult.accounts.some((account, ii) => account.address !== authorizationResult.accounts[ii].address);
        this._authorizationResult = authorizationResult;
        this.declareWalletAsInstalled();
        if (didPublicKeysChange) {
          const nextSelectedAddress = yield this._addressSelector.select(authorizationResult.accounts.map(({ address }) => address));
          if (nextSelectedAddress !== this._selectedAddress) {
            this._selectedAddress = nextSelectedAddress;
            delete this._publicKey;
            this.emit(
              "connect",
              this.publicKey
            );
          }
        }
      });
    }
    performReauthorization(wallet, authToken) {
      return __awaiter(this, void 0, void 0, function* () {
        try {
          const authorizationResult = yield wallet.reauthorize({
            auth_token: authToken
          });
          Promise.all([
            this._authorizationResultCache.set(authorizationResult),
            this.handleAuthorizationResult(authorizationResult)
          ]);
        } catch (e) {
          this.disconnect();
          throw new walletAdapterBase.WalletDisconnectedError(e instanceof Error && (e === null || e === void 0 ? void 0 : e.message) || "Unknown error", e);
        }
      });
    }
    disconnect() {
      return __awaiter(this, void 0, void 0, function* () {
        this._authorizationResultCache.clear();
        this._connecting = false;
        this._connectionGeneration++;
        delete this._authorizationResult;
        delete this._publicKey;
        delete this._selectedAddress;
        this.emit("disconnect");
      });
    }
    transact(callback) {
      var _a;
      return __awaiter(this, void 0, void 0, function* () {
        const walletUriBase = (_a = this._authorizationResult) === null || _a === void 0 ? void 0 : _a.wallet_uri_base;
        const config = walletUriBase ? { baseUri: walletUriBase } : void 0;
        const currentConnectionGeneration = this._connectionGeneration;
        try {
          return yield transact(callback, config);
        } catch (e) {
          if (this._connectionGeneration !== currentConnectionGeneration) {
            yield new Promise(() => {
            });
          }
          if (e instanceof Error && e.name === "SolanaMobileWalletAdapterError" && e.code === "ERROR_WALLET_NOT_FOUND") {
            yield this._onWalletNotFound(this);
          }
          throw e;
        }
      });
    }
    assertIsAuthorized() {
      if (!this._authorizationResult || !this._selectedAddress)
        throw new walletAdapterBase.WalletNotConnectedError();
      return {
        authToken: this._authorizationResult.auth_token,
        selectedAddress: this._selectedAddress
      };
    }
    performSignTransactions(transactions) {
      return __awaiter(this, void 0, void 0, function* () {
        const { authToken } = this.assertIsAuthorized();
        try {
          return yield this.transact((wallet) => __awaiter(this, void 0, void 0, function* () {
            yield this.performReauthorization(wallet, authToken);
            const signedTransactions = yield wallet.signTransactions({
              transactions
            });
            return signedTransactions;
          }));
        } catch (error) {
          throw new walletAdapterBase.WalletSignTransactionError(error === null || error === void 0 ? void 0 : error.message, error);
        }
      });
    }
    sendTransaction(transaction, connection, options) {
      return __awaiter(this, void 0, void 0, function* () {
        return yield this.runWithGuard(() => __awaiter(this, void 0, void 0, function* () {
          const { authToken } = this.assertIsAuthorized();
          const minContextSlot = options === null || options === void 0 ? void 0 : options.minContextSlot;
          try {
            return yield this.transact((wallet) => __awaiter(this, void 0, void 0, function* () {
              function getTargetCommitment() {
                let targetCommitment;
                switch (connection.commitment) {
                  case "confirmed":
                  case "finalized":
                  case "processed":
                    targetCommitment = connection.commitment;
                    break;
                  default:
                    targetCommitment = "finalized";
                }
                let targetPreflightCommitment;
                switch (options === null || options === void 0 ? void 0 : options.preflightCommitment) {
                  case "confirmed":
                  case "finalized":
                  case "processed":
                    targetPreflightCommitment = options.preflightCommitment;
                    break;
                  case void 0:
                    targetPreflightCommitment = targetCommitment;
                  default:
                    targetPreflightCommitment = "finalized";
                }
                const preflightCommitmentScore = targetPreflightCommitment === "finalized" ? 2 : targetPreflightCommitment === "confirmed" ? 1 : 0;
                const targetCommitmentScore = targetCommitment === "finalized" ? 2 : targetCommitment === "confirmed" ? 1 : 0;
                return preflightCommitmentScore < targetCommitmentScore ? targetPreflightCommitment : targetCommitment;
              }
              const [capabilities, _1, _2] = yield Promise.all([
                wallet.getCapabilities(),
                this.performReauthorization(wallet, authToken),
                isVersionedTransaction$1(transaction) ? null : (() => __awaiter(this, void 0, void 0, function* () {
                  var _a;
                  transaction.feePayer || (transaction.feePayer = (_a = this.publicKey) !== null && _a !== void 0 ? _a : void 0);
                  if (transaction.recentBlockhash == null) {
                    const { blockhash } = yield connection.getLatestBlockhash({
                      commitment: getTargetCommitment()
                    });
                    transaction.recentBlockhash = blockhash;
                  }
                }))()
              ]);
              if (capabilities.supports_sign_and_send_transactions) {
                const signatures = yield wallet.signAndSendTransactions({
                  minContextSlot,
                  transactions: [transaction]
                });
                return signatures[0];
              } else {
                const [signedTransaction] = yield wallet.signTransactions({
                  transactions: [transaction]
                });
                if (isVersionedTransaction$1(signedTransaction)) {
                  return yield connection.sendTransaction(signedTransaction);
                } else {
                  const serializedTransaction = signedTransaction.serialize();
                  return yield connection.sendRawTransaction(serializedTransaction, Object.assign(Object.assign({}, options), { preflightCommitment: getTargetCommitment() }));
                }
              }
            }));
          } catch (error) {
            throw new walletAdapterBase.WalletSendTransactionError(error === null || error === void 0 ? void 0 : error.message, error);
          }
        }));
      });
    }
    signTransaction(transaction) {
      return __awaiter(this, void 0, void 0, function* () {
        return yield this.runWithGuard(() => __awaiter(this, void 0, void 0, function* () {
          const [signedTransaction] = yield this.performSignTransactions([transaction]);
          return signedTransaction;
        }));
      });
    }
    signAllTransactions(transactions) {
      return __awaiter(this, void 0, void 0, function* () {
        return yield this.runWithGuard(() => __awaiter(this, void 0, void 0, function* () {
          const signedTransactions = yield this.performSignTransactions(transactions);
          return signedTransactions;
        }));
      });
    }
    signMessage(message) {
      return __awaiter(this, void 0, void 0, function* () {
        return yield this.runWithGuard(() => __awaiter(this, void 0, void 0, function* () {
          const { authToken, selectedAddress } = this.assertIsAuthorized();
          try {
            return yield this.transact((wallet) => __awaiter(this, void 0, void 0, function* () {
              yield this.performReauthorization(wallet, authToken);
              const [signedMessage] = yield wallet.signMessages({
                addresses: [selectedAddress],
                payloads: [message]
              });
              const signature = signedMessage.slice(-SIGNATURE_LENGTH_IN_BYTES);
              return signature;
            }));
          } catch (error) {
            throw new walletAdapterBase.WalletSignMessageError(error === null || error === void 0 ? void 0 : error.message, error);
          }
        }));
      });
    }
  }
  function createDefaultAddressSelector() {
    return {
      select(addresses) {
        return __awaiter(this, void 0, void 0, function* () {
          return addresses[0];
        });
      }
    };
  }
  const CACHE_KEY = "SolanaMobileWalletAdapterDefaultAuthorizationCache";
  function createDefaultAuthorizationResultCache() {
    let storage;
    try {
      storage = window.localStorage;
    } catch (_a) {
    }
    return {
      clear() {
        return __awaiter(this, void 0, void 0, function* () {
          if (!storage) {
            return;
          }
          try {
            storage.removeItem(CACHE_KEY);
          } catch (_a) {
          }
        });
      },
      get() {
        return __awaiter(this, void 0, void 0, function* () {
          if (!storage) {
            return;
          }
          try {
            return JSON.parse(storage.getItem(CACHE_KEY)) || void 0;
          } catch (_a) {
          }
        });
      },
      set(authorizationResult) {
        return __awaiter(this, void 0, void 0, function* () {
          if (!storage) {
            return;
          }
          try {
            storage.setItem(CACHE_KEY, JSON.stringify(authorizationResult));
          } catch (_a) {
          }
        });
      }
    };
  }
  function defaultWalletNotFoundHandler(mobileWalletAdapter) {
    return __awaiter(this, void 0, void 0, function* () {
      if (typeof window !== "undefined") {
        window.location.assign(mobileWalletAdapter.url);
      }
    });
  }
  function createDefaultWalletNotFoundHandler() {
    return defaultWalletNotFoundHandler;
  }
  function useAdapterListeners(wallet, unloadingWindow, isUsingMwaAdapterOnMobile, deselect, refreshWalletState, handleError) {
    vue.watch(wallet, (newWallet, oldWallet) => {
      const newAdapter = newWallet == null ? void 0 : newWallet.adapter;
      const oldAdapter = oldWallet == null ? void 0 : oldWallet.adapter;
      if (!newAdapter || !oldAdapter)
        return;
      if (newAdapter.name === oldAdapter.name)
        return;
      if (oldAdapter.name === SolanaMobileWalletAdapterWalletName)
        return;
      oldAdapter.disconnect();
    });
    vue.watchEffect((onInvalidate) => {
      var _a;
      const adapter = (_a = wallet.value) == null ? void 0 : _a.adapter;
      if (!adapter)
        return;
      const handleAdapterConnect = () => {
        refreshWalletState();
      };
      const handleAdapterDisconnect = () => {
        if (unloadingWindow.value || isUsingMwaAdapterOnMobile.value)
          return;
        deselect(true);
      };
      const handleAdapterError = (error) => {
        return handleError(error, adapter);
      };
      adapter.on("connect", handleAdapterConnect);
      adapter.on("disconnect", handleAdapterDisconnect);
      adapter.on("error", handleAdapterError);
      onInvalidate(() => {
        adapter.off("connect", handleAdapterConnect);
        adapter.off("disconnect", handleAdapterDisconnect);
        adapter.off("error", handleAdapterError);
      });
    });
  }
  function useAutoConnect(initialAutoConnect, wallet, isUsingMwaAdapterOnMobile, connecting, connected, ready, deselect) {
    const autoConnect = vue.ref(initialAutoConnect);
    const hasAttemptedToAutoConnect = vue.ref(false);
    vue.watch(wallet, () => {
      hasAttemptedToAutoConnect.value = false;
    });
    vue.watchEffect(() => {
      if (hasAttemptedToAutoConnect.value || !autoConnect.value || !wallet.value || !ready.value || connected.value || connecting.value) {
        return;
      }
      (async () => {
        if (!wallet.value)
          return;
        connecting.value = true;
        hasAttemptedToAutoConnect.value = true;
        try {
          if (isUsingMwaAdapterOnMobile.value) {
            await wallet.value.adapter.autoConnect_DO_NOT_USE_OR_YOU_WILL_BE_FIRED();
          } else {
            await wallet.value.adapter.connect();
          }
        } catch (error) {
          deselect();
        } finally {
          connecting.value = false;
        }
      })();
    });
    return autoConnect;
  }
  function useEnvironment(adapters) {
    const userAgent = getUserAgent();
    const uriForAppIdentity = getUriForAppIdentity();
    const environment = vue.computed(() => getEnvironment(adapters.value, userAgent));
    const isMobile = vue.computed(() => environment.value === 1);
    return {
      userAgent,
      uriForAppIdentity,
      environment,
      isMobile
    };
  }
  let _userAgent;
  function getUserAgent() {
    var _a, _b;
    if (_userAgent === void 0) {
      _userAgent = (_b = (_a = globalThis.navigator) == null ? void 0 : _a.userAgent) != null ? _b : null;
    }
    return _userAgent;
  }
  function getUriForAppIdentity() {
    const location = globalThis.location;
    if (location == null)
      return null;
    return `${location.protocol}//${location.host}`;
  }
  function getEnvironment(adapters, userAgent) {
    const hasInstalledAdapters = adapters.some(
      (adapter) => adapter.name !== SolanaMobileWalletAdapterWalletName && adapter.readyState === walletAdapterBase.WalletReadyState.Installed
    );
    if (hasInstalledAdapters) {
      return 0;
    }
    const isMobile = userAgent && isOsThatSupportsMwa(userAgent) && !isWebView(userAgent);
    if (isMobile) {
      return 1;
    }
    return 0;
  }
  function isOsThatSupportsMwa(userAgent) {
    return /android/i.test(userAgent);
  }
  function isWebView(userAgent) {
    return /(WebView|Version\/.+(Chrome)\/(\d+)\.(\d+)\.(\d+)\.(\d+)|; wv\).+(Chrome)\/(\d+)\.(\d+)\.(\d+)\.(\d+))/i.test(
      userAgent
    );
  }
  function useErrorHandler(unloadingWindow, onError) {
    return (error, adapter) => {
      if (unloadingWindow.value) {
        return error;
      }
      if (onError) {
        onError(error, adapter);
        return error;
      }
      console.error(error, adapter);
      if (error instanceof walletAdapterBase.WalletNotReadyError && typeof window !== "undefined" && adapter) {
        window.open(adapter.url, "_blank");
      }
      return error;
    };
  }
  function useMobileWalletAdapters(adapters, isMobile, uriForAppIdentity, cluster) {
    const mwaAdapter = vue.computed(() => {
      if (!isMobile.value)
        return null;
      const existingMobileWalletAdapter = adapters.value.find(
        (adapter) => adapter.name === SolanaMobileWalletAdapterWalletName
      );
      if (existingMobileWalletAdapter) {
        return existingMobileWalletAdapter;
      }
      return new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: { uri: uriForAppIdentity || void 0 },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        cluster: cluster.value,
        onWalletNotFound: createDefaultWalletNotFoundHandler()
      });
    });
    return vue.computed(() => {
      if (mwaAdapter.value == null || adapters.value.indexOf(mwaAdapter.value) !== -1) {
        return adapters.value;
      }
      return [mwaAdapter.value, ...adapters.value];
    });
  }
  function useReadyStateListeners(wallets2) {
    vue.watchEffect((onInvalidate) => {
      function handleReadyStateChange(readyState) {
        const prevWallets = wallets2.value;
        const index2 = prevWallets.findIndex(({ adapter }) => adapter === this);
        if (index2 === -1)
          return;
        wallets2.value = [
          ...prevWallets.slice(0, index2),
          { adapter: this, readyState },
          ...prevWallets.slice(index2 + 1)
        ];
      }
      wallets2.value.forEach(
        ({ adapter }) => adapter.on("readyStateChange", handleReadyStateChange, adapter)
      );
      onInvalidate(
        () => wallets2.value.forEach(
          ({ adapter }) => adapter.off("readyStateChange", handleReadyStateChange, adapter)
        )
      );
    });
  }
  function useSelectWalletName(localStorageKey, isMobile) {
    const name = core.useLocalStorage(
      localStorageKey,
      isMobile.value ? SolanaMobileWalletAdapterWalletName : null
    );
    const isUsingMwaAdapter = vue.computed(
      () => name.value === SolanaMobileWalletAdapterWalletName
    );
    const isUsingMwaAdapterOnMobile = vue.computed(
      () => isUsingMwaAdapter.value && isMobile.value
    );
    const select = (walletName) => {
      if (name.value !== walletName) {
        name.value = walletName;
      }
    };
    const deselect = (force = true) => {
      if (force || isUsingMwaAdapter.value) {
        name.value = null;
      }
    };
    return {
      name,
      isUsingMwaAdapter,
      isUsingMwaAdapterOnMobile,
      select,
      deselect
    };
  }
  function getCommitment(commitment) {
    switch (commitment) {
      case "processed":
      case "confirmed":
      case "finalized":
      case void 0:
        return commitment;
      case "recent":
        return "processed";
      case "single":
      case "singleGossip":
        return "confirmed";
      case "max":
      case "root":
        return "finalized";
      default:
        return void 0;
    }
  }
  const SOLANA_MAINNET_CHAIN = "solana:mainnet";
  const SOLANA_DEVNET_CHAIN = "solana:devnet";
  const SOLANA_TESTNET_CHAIN = "solana:testnet";
  const SOLANA_LOCALNET_CHAIN = "solana:localnet";
  const MAINNET_ENDPOINT = "https://api.mainnet-beta.solana.com";
  function getChainForEndpoint(endpoint) {
    if (endpoint.includes(MAINNET_ENDPOINT))
      return SOLANA_MAINNET_CHAIN;
    if (/\bdevnet\b/i.test(endpoint))
      return SOLANA_DEVNET_CHAIN;
    if (/\btestnet\b/i.test(endpoint))
      return SOLANA_TESTNET_CHAIN;
    if (/\blocalhost\b/i.test(endpoint) || /\b127\.0\.0\.1\b/.test(endpoint))
      return SOLANA_LOCALNET_CHAIN;
    return SOLANA_MAINNET_CHAIN;
  }
  globalThis && globalThis.__classPrivateFieldSet || function(receiver, state, value, kind, f) {
    if (kind === "m")
      throw new TypeError("Private method is not writable");
    if (kind === "a" && !f)
      throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
      throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
  };
  globalThis && globalThis.__classPrivateFieldGet || function(receiver, state, kind, f) {
    if (kind === "a" && !f)
      throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
      throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
  };
  function arraysEqual(a, b) {
    if (a === b)
      return true;
    const length = a.length;
    if (length !== b.length)
      return false;
    for (let i2 = 0; i2 < length; i2++) {
      if (a[i2] !== b[i2])
        return false;
    }
    return true;
  }
  var safeBuffer = { exports: {} };
  var buffer = {};
  var base64Js = {};
  base64Js.byteLength = byteLength;
  base64Js.toByteArray = toByteArray;
  base64Js.fromByteArray = fromByteArray;
  var lookup = [];
  var revLookup = [];
  var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
  var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (var i = 0, len = code.length; i < len; ++i) {
    lookup[i] = code[i];
    revLookup[code.charCodeAt(i)] = i;
  }
  revLookup["-".charCodeAt(0)] = 62;
  revLookup["_".charCodeAt(0)] = 63;
  function getLens(b64) {
    var len2 = b64.length;
    if (len2 % 4 > 0) {
      throw new Error("Invalid string. Length must be a multiple of 4");
    }
    var validLen = b64.indexOf("=");
    if (validLen === -1)
      validLen = len2;
    var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
    return [validLen, placeHoldersLen];
  }
  function byteLength(b64) {
    var lens = getLens(b64);
    var validLen = lens[0];
    var placeHoldersLen = lens[1];
    return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
  }
  function _byteLength(b64, validLen, placeHoldersLen) {
    return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
  }
  function toByteArray(b64) {
    var tmp;
    var lens = getLens(b64);
    var validLen = lens[0];
    var placeHoldersLen = lens[1];
    var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
    var curByte = 0;
    var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
    var i2;
    for (i2 = 0; i2 < len2; i2 += 4) {
      tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)];
      arr[curByte++] = tmp >> 16 & 255;
      arr[curByte++] = tmp >> 8 & 255;
      arr[curByte++] = tmp & 255;
    }
    if (placeHoldersLen === 2) {
      tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4;
      arr[curByte++] = tmp & 255;
    }
    if (placeHoldersLen === 1) {
      tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2;
      arr[curByte++] = tmp >> 8 & 255;
      arr[curByte++] = tmp & 255;
    }
    return arr;
  }
  function tripletToBase64(num) {
    return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
  }
  function encodeChunk(uint8, start, end) {
    var tmp;
    var output = [];
    for (var i2 = start; i2 < end; i2 += 3) {
      tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
      output.push(tripletToBase64(tmp));
    }
    return output.join("");
  }
  function fromByteArray(uint8) {
    var tmp;
    var len2 = uint8.length;
    var extraBytes = len2 % 3;
    var parts = [];
    var maxChunkLength = 16383;
    for (var i2 = 0, len22 = len2 - extraBytes; i2 < len22; i2 += maxChunkLength) {
      parts.push(encodeChunk(uint8, i2, i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength));
    }
    if (extraBytes === 1) {
      tmp = uint8[len2 - 1];
      parts.push(
        lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "=="
      );
    } else if (extraBytes === 2) {
      tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
      parts.push(
        lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "="
      );
    }
    return parts.join("");
  }
  var ieee754 = {};
  /*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
  ieee754.read = function(buffer2, offset, isLE, mLen, nBytes) {
    var e, m;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var nBits = -7;
    var i2 = isLE ? nBytes - 1 : 0;
    var d = isLE ? -1 : 1;
    var s = buffer2[offset + i2];
    i2 += d;
    e = s & (1 << -nBits) - 1;
    s >>= -nBits;
    nBits += eLen;
    for (; nBits > 0; e = e * 256 + buffer2[offset + i2], i2 += d, nBits -= 8) {
    }
    m = e & (1 << -nBits) - 1;
    e >>= -nBits;
    nBits += mLen;
    for (; nBits > 0; m = m * 256 + buffer2[offset + i2], i2 += d, nBits -= 8) {
    }
    if (e === 0) {
      e = 1 - eBias;
    } else if (e === eMax) {
      return m ? NaN : (s ? -1 : 1) * Infinity;
    } else {
      m = m + Math.pow(2, mLen);
      e = e - eBias;
    }
    return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
  };
  ieee754.write = function(buffer2, value, offset, isLE, mLen, nBytes) {
    var e, m, c;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
    var i2 = isLE ? 0 : nBytes - 1;
    var d = isLE ? 1 : -1;
    var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
    value = Math.abs(value);
    if (isNaN(value) || value === Infinity) {
      m = isNaN(value) ? 1 : 0;
      e = eMax;
    } else {
      e = Math.floor(Math.log(value) / Math.LN2);
      if (value * (c = Math.pow(2, -e)) < 1) {
        e--;
        c *= 2;
      }
      if (e + eBias >= 1) {
        value += rt / c;
      } else {
        value += rt * Math.pow(2, 1 - eBias);
      }
      if (value * c >= 2) {
        e++;
        c /= 2;
      }
      if (e + eBias >= eMax) {
        m = 0;
        e = eMax;
      } else if (e + eBias >= 1) {
        m = (value * c - 1) * Math.pow(2, mLen);
        e = e + eBias;
      } else {
        m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
        e = 0;
      }
    }
    for (; mLen >= 8; buffer2[offset + i2] = m & 255, i2 += d, m /= 256, mLen -= 8) {
    }
    e = e << mLen | m;
    eLen += mLen;
    for (; eLen > 0; buffer2[offset + i2] = e & 255, i2 += d, e /= 256, eLen -= 8) {
    }
    buffer2[offset + i2 - d] |= s * 128;
  };
  /*!
   * The buffer module from node.js, for the browser.
   *
   * @author   Feross Aboukhadijeh <https://feross.org>
   * @license  MIT
   */
  (function(exports3) {
    const base64 = base64Js;
    const ieee754$1 = ieee754;
    const customInspectSymbol = typeof Symbol === "function" && typeof Symbol["for"] === "function" ? Symbol["for"]("nodejs.util.inspect.custom") : null;
    exports3.Buffer = Buffer2;
    exports3.SlowBuffer = SlowBuffer;
    exports3.INSPECT_MAX_BYTES = 50;
    const K_MAX_LENGTH = 2147483647;
    exports3.kMaxLength = K_MAX_LENGTH;
    Buffer2.TYPED_ARRAY_SUPPORT = typedArraySupport();
    if (!Buffer2.TYPED_ARRAY_SUPPORT && typeof console !== "undefined" && typeof console.error === "function") {
      console.error(
        "This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."
      );
    }
    function typedArraySupport() {
      try {
        const arr = new Uint8Array(1);
        const proto = { foo: function() {
          return 42;
        } };
        Object.setPrototypeOf(proto, Uint8Array.prototype);
        Object.setPrototypeOf(arr, proto);
        return arr.foo() === 42;
      } catch (e) {
        return false;
      }
    }
    Object.defineProperty(Buffer2.prototype, "parent", {
      enumerable: true,
      get: function() {
        if (!Buffer2.isBuffer(this))
          return void 0;
        return this.buffer;
      }
    });
    Object.defineProperty(Buffer2.prototype, "offset", {
      enumerable: true,
      get: function() {
        if (!Buffer2.isBuffer(this))
          return void 0;
        return this.byteOffset;
      }
    });
    function createBuffer(length) {
      if (length > K_MAX_LENGTH) {
        throw new RangeError('The value "' + length + '" is invalid for option "size"');
      }
      const buf = new Uint8Array(length);
      Object.setPrototypeOf(buf, Buffer2.prototype);
      return buf;
    }
    function Buffer2(arg, encodingOrOffset, length) {
      if (typeof arg === "number") {
        if (typeof encodingOrOffset === "string") {
          throw new TypeError(
            'The "string" argument must be of type string. Received type number'
          );
        }
        return allocUnsafe(arg);
      }
      return from(arg, encodingOrOffset, length);
    }
    Buffer2.poolSize = 8192;
    function from(value, encodingOrOffset, length) {
      if (typeof value === "string") {
        return fromString(value, encodingOrOffset);
      }
      if (ArrayBuffer.isView(value)) {
        return fromArrayView(value);
      }
      if (value == null) {
        throw new TypeError(
          "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
        );
      }
      if (isInstance(value, ArrayBuffer) || value && isInstance(value.buffer, ArrayBuffer)) {
        return fromArrayBuffer(value, encodingOrOffset, length);
      }
      if (typeof SharedArrayBuffer !== "undefined" && (isInstance(value, SharedArrayBuffer) || value && isInstance(value.buffer, SharedArrayBuffer))) {
        return fromArrayBuffer(value, encodingOrOffset, length);
      }
      if (typeof value === "number") {
        throw new TypeError(
          'The "value" argument must not be of type number. Received type number'
        );
      }
      const valueOf = value.valueOf && value.valueOf();
      if (valueOf != null && valueOf !== value) {
        return Buffer2.from(valueOf, encodingOrOffset, length);
      }
      const b = fromObject(value);
      if (b)
        return b;
      if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function") {
        return Buffer2.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length);
      }
      throw new TypeError(
        "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
      );
    }
    Buffer2.from = function(value, encodingOrOffset, length) {
      return from(value, encodingOrOffset, length);
    };
    Object.setPrototypeOf(Buffer2.prototype, Uint8Array.prototype);
    Object.setPrototypeOf(Buffer2, Uint8Array);
    function assertSize(size) {
      if (typeof size !== "number") {
        throw new TypeError('"size" argument must be of type number');
      } else if (size < 0) {
        throw new RangeError('The value "' + size + '" is invalid for option "size"');
      }
    }
    function alloc(size, fill, encoding) {
      assertSize(size);
      if (size <= 0) {
        return createBuffer(size);
      }
      if (fill !== void 0) {
        return typeof encoding === "string" ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
      }
      return createBuffer(size);
    }
    Buffer2.alloc = function(size, fill, encoding) {
      return alloc(size, fill, encoding);
    };
    function allocUnsafe(size) {
      assertSize(size);
      return createBuffer(size < 0 ? 0 : checked(size) | 0);
    }
    Buffer2.allocUnsafe = function(size) {
      return allocUnsafe(size);
    };
    Buffer2.allocUnsafeSlow = function(size) {
      return allocUnsafe(size);
    };
    function fromString(string, encoding) {
      if (typeof encoding !== "string" || encoding === "") {
        encoding = "utf8";
      }
      if (!Buffer2.isEncoding(encoding)) {
        throw new TypeError("Unknown encoding: " + encoding);
      }
      const length = byteLength2(string, encoding) | 0;
      let buf = createBuffer(length);
      const actual = buf.write(string, encoding);
      if (actual !== length) {
        buf = buf.slice(0, actual);
      }
      return buf;
    }
    function fromArrayLike(array) {
      const length = array.length < 0 ? 0 : checked(array.length) | 0;
      const buf = createBuffer(length);
      for (let i2 = 0; i2 < length; i2 += 1) {
        buf[i2] = array[i2] & 255;
      }
      return buf;
    }
    function fromArrayView(arrayView) {
      if (isInstance(arrayView, Uint8Array)) {
        const copy = new Uint8Array(arrayView);
        return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength);
      }
      return fromArrayLike(arrayView);
    }
    function fromArrayBuffer(array, byteOffset, length) {
      if (byteOffset < 0 || array.byteLength < byteOffset) {
        throw new RangeError('"offset" is outside of buffer bounds');
      }
      if (array.byteLength < byteOffset + (length || 0)) {
        throw new RangeError('"length" is outside of buffer bounds');
      }
      let buf;
      if (byteOffset === void 0 && length === void 0) {
        buf = new Uint8Array(array);
      } else if (length === void 0) {
        buf = new Uint8Array(array, byteOffset);
      } else {
        buf = new Uint8Array(array, byteOffset, length);
      }
      Object.setPrototypeOf(buf, Buffer2.prototype);
      return buf;
    }
    function fromObject(obj) {
      if (Buffer2.isBuffer(obj)) {
        const len2 = checked(obj.length) | 0;
        const buf = createBuffer(len2);
        if (buf.length === 0) {
          return buf;
        }
        obj.copy(buf, 0, 0, len2);
        return buf;
      }
      if (obj.length !== void 0) {
        if (typeof obj.length !== "number" || numberIsNaN(obj.length)) {
          return createBuffer(0);
        }
        return fromArrayLike(obj);
      }
      if (obj.type === "Buffer" && Array.isArray(obj.data)) {
        return fromArrayLike(obj.data);
      }
    }
    function checked(length) {
      if (length >= K_MAX_LENGTH) {
        throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
      }
      return length | 0;
    }
    function SlowBuffer(length) {
      if (+length != length) {
        length = 0;
      }
      return Buffer2.alloc(+length);
    }
    Buffer2.isBuffer = function isBuffer(b) {
      return b != null && b._isBuffer === true && b !== Buffer2.prototype;
    };
    Buffer2.compare = function compare(a, b) {
      if (isInstance(a, Uint8Array))
        a = Buffer2.from(a, a.offset, a.byteLength);
      if (isInstance(b, Uint8Array))
        b = Buffer2.from(b, b.offset, b.byteLength);
      if (!Buffer2.isBuffer(a) || !Buffer2.isBuffer(b)) {
        throw new TypeError(
          'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
        );
      }
      if (a === b)
        return 0;
      let x = a.length;
      let y = b.length;
      for (let i2 = 0, len2 = Math.min(x, y); i2 < len2; ++i2) {
        if (a[i2] !== b[i2]) {
          x = a[i2];
          y = b[i2];
          break;
        }
      }
      if (x < y)
        return -1;
      if (y < x)
        return 1;
      return 0;
    };
    Buffer2.isEncoding = function isEncoding(encoding) {
      switch (String(encoding).toLowerCase()) {
        case "hex":
        case "utf8":
        case "utf-8":
        case "ascii":
        case "latin1":
        case "binary":
        case "base64":
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return true;
        default:
          return false;
      }
    };
    Buffer2.concat = function concat(list, length) {
      if (!Array.isArray(list)) {
        throw new TypeError('"list" argument must be an Array of Buffers');
      }
      if (list.length === 0) {
        return Buffer2.alloc(0);
      }
      let i2;
      if (length === void 0) {
        length = 0;
        for (i2 = 0; i2 < list.length; ++i2) {
          length += list[i2].length;
        }
      }
      const buffer2 = Buffer2.allocUnsafe(length);
      let pos = 0;
      for (i2 = 0; i2 < list.length; ++i2) {
        let buf = list[i2];
        if (isInstance(buf, Uint8Array)) {
          if (pos + buf.length > buffer2.length) {
            if (!Buffer2.isBuffer(buf))
              buf = Buffer2.from(buf);
            buf.copy(buffer2, pos);
          } else {
            Uint8Array.prototype.set.call(
              buffer2,
              buf,
              pos
            );
          }
        } else if (!Buffer2.isBuffer(buf)) {
          throw new TypeError('"list" argument must be an Array of Buffers');
        } else {
          buf.copy(buffer2, pos);
        }
        pos += buf.length;
      }
      return buffer2;
    };
    function byteLength2(string, encoding) {
      if (Buffer2.isBuffer(string)) {
        return string.length;
      }
      if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
        return string.byteLength;
      }
      if (typeof string !== "string") {
        throw new TypeError(
          'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof string
        );
      }
      const len2 = string.length;
      const mustMatch = arguments.length > 2 && arguments[2] === true;
      if (!mustMatch && len2 === 0)
        return 0;
      let loweredCase = false;
      for (; ; ) {
        switch (encoding) {
          case "ascii":
          case "latin1":
          case "binary":
            return len2;
          case "utf8":
          case "utf-8":
            return utf8ToBytes(string).length;
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return len2 * 2;
          case "hex":
            return len2 >>> 1;
          case "base64":
            return base64ToBytes(string).length;
          default:
            if (loweredCase) {
              return mustMatch ? -1 : utf8ToBytes(string).length;
            }
            encoding = ("" + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    }
    Buffer2.byteLength = byteLength2;
    function slowToString(encoding, start, end) {
      let loweredCase = false;
      if (start === void 0 || start < 0) {
        start = 0;
      }
      if (start > this.length) {
        return "";
      }
      if (end === void 0 || end > this.length) {
        end = this.length;
      }
      if (end <= 0) {
        return "";
      }
      end >>>= 0;
      start >>>= 0;
      if (end <= start) {
        return "";
      }
      if (!encoding)
        encoding = "utf8";
      while (true) {
        switch (encoding) {
          case "hex":
            return hexSlice(this, start, end);
          case "utf8":
          case "utf-8":
            return utf8Slice(this, start, end);
          case "ascii":
            return asciiSlice(this, start, end);
          case "latin1":
          case "binary":
            return latin1Slice(this, start, end);
          case "base64":
            return base64Slice(this, start, end);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return utf16leSlice(this, start, end);
          default:
            if (loweredCase)
              throw new TypeError("Unknown encoding: " + encoding);
            encoding = (encoding + "").toLowerCase();
            loweredCase = true;
        }
      }
    }
    Buffer2.prototype._isBuffer = true;
    function swap(b, n, m) {
      const i2 = b[n];
      b[n] = b[m];
      b[m] = i2;
    }
    Buffer2.prototype.swap16 = function swap16() {
      const len2 = this.length;
      if (len2 % 2 !== 0) {
        throw new RangeError("Buffer size must be a multiple of 16-bits");
      }
      for (let i2 = 0; i2 < len2; i2 += 2) {
        swap(this, i2, i2 + 1);
      }
      return this;
    };
    Buffer2.prototype.swap32 = function swap32() {
      const len2 = this.length;
      if (len2 % 4 !== 0) {
        throw new RangeError("Buffer size must be a multiple of 32-bits");
      }
      for (let i2 = 0; i2 < len2; i2 += 4) {
        swap(this, i2, i2 + 3);
        swap(this, i2 + 1, i2 + 2);
      }
      return this;
    };
    Buffer2.prototype.swap64 = function swap64() {
      const len2 = this.length;
      if (len2 % 8 !== 0) {
        throw new RangeError("Buffer size must be a multiple of 64-bits");
      }
      for (let i2 = 0; i2 < len2; i2 += 8) {
        swap(this, i2, i2 + 7);
        swap(this, i2 + 1, i2 + 6);
        swap(this, i2 + 2, i2 + 5);
        swap(this, i2 + 3, i2 + 4);
      }
      return this;
    };
    Buffer2.prototype.toString = function toString() {
      const length = this.length;
      if (length === 0)
        return "";
      if (arguments.length === 0)
        return utf8Slice(this, 0, length);
      return slowToString.apply(this, arguments);
    };
    Buffer2.prototype.toLocaleString = Buffer2.prototype.toString;
    Buffer2.prototype.equals = function equals(b) {
      if (!Buffer2.isBuffer(b))
        throw new TypeError("Argument must be a Buffer");
      if (this === b)
        return true;
      return Buffer2.compare(this, b) === 0;
    };
    Buffer2.prototype.inspect = function inspect() {
      let str = "";
      const max = exports3.INSPECT_MAX_BYTES;
      str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
      if (this.length > max)
        str += " ... ";
      return "<Buffer " + str + ">";
    };
    if (customInspectSymbol) {
      Buffer2.prototype[customInspectSymbol] = Buffer2.prototype.inspect;
    }
    Buffer2.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
      if (isInstance(target, Uint8Array)) {
        target = Buffer2.from(target, target.offset, target.byteLength);
      }
      if (!Buffer2.isBuffer(target)) {
        throw new TypeError(
          'The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof target
        );
      }
      if (start === void 0) {
        start = 0;
      }
      if (end === void 0) {
        end = target ? target.length : 0;
      }
      if (thisStart === void 0) {
        thisStart = 0;
      }
      if (thisEnd === void 0) {
        thisEnd = this.length;
      }
      if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
        throw new RangeError("out of range index");
      }
      if (thisStart >= thisEnd && start >= end) {
        return 0;
      }
      if (thisStart >= thisEnd) {
        return -1;
      }
      if (start >= end) {
        return 1;
      }
      start >>>= 0;
      end >>>= 0;
      thisStart >>>= 0;
      thisEnd >>>= 0;
      if (this === target)
        return 0;
      let x = thisEnd - thisStart;
      let y = end - start;
      const len2 = Math.min(x, y);
      const thisCopy = this.slice(thisStart, thisEnd);
      const targetCopy = target.slice(start, end);
      for (let i2 = 0; i2 < len2; ++i2) {
        if (thisCopy[i2] !== targetCopy[i2]) {
          x = thisCopy[i2];
          y = targetCopy[i2];
          break;
        }
      }
      if (x < y)
        return -1;
      if (y < x)
        return 1;
      return 0;
    };
    function bidirectionalIndexOf(buffer2, val, byteOffset, encoding, dir) {
      if (buffer2.length === 0)
        return -1;
      if (typeof byteOffset === "string") {
        encoding = byteOffset;
        byteOffset = 0;
      } else if (byteOffset > 2147483647) {
        byteOffset = 2147483647;
      } else if (byteOffset < -2147483648) {
        byteOffset = -2147483648;
      }
      byteOffset = +byteOffset;
      if (numberIsNaN(byteOffset)) {
        byteOffset = dir ? 0 : buffer2.length - 1;
      }
      if (byteOffset < 0)
        byteOffset = buffer2.length + byteOffset;
      if (byteOffset >= buffer2.length) {
        if (dir)
          return -1;
        else
          byteOffset = buffer2.length - 1;
      } else if (byteOffset < 0) {
        if (dir)
          byteOffset = 0;
        else
          return -1;
      }
      if (typeof val === "string") {
        val = Buffer2.from(val, encoding);
      }
      if (Buffer2.isBuffer(val)) {
        if (val.length === 0) {
          return -1;
        }
        return arrayIndexOf(buffer2, val, byteOffset, encoding, dir);
      } else if (typeof val === "number") {
        val = val & 255;
        if (typeof Uint8Array.prototype.indexOf === "function") {
          if (dir) {
            return Uint8Array.prototype.indexOf.call(buffer2, val, byteOffset);
          } else {
            return Uint8Array.prototype.lastIndexOf.call(buffer2, val, byteOffset);
          }
        }
        return arrayIndexOf(buffer2, [val], byteOffset, encoding, dir);
      }
      throw new TypeError("val must be string, number or Buffer");
    }
    function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
      let indexSize = 1;
      let arrLength = arr.length;
      let valLength = val.length;
      if (encoding !== void 0) {
        encoding = String(encoding).toLowerCase();
        if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
          if (arr.length < 2 || val.length < 2) {
            return -1;
          }
          indexSize = 2;
          arrLength /= 2;
          valLength /= 2;
          byteOffset /= 2;
        }
      }
      function read(buf, i3) {
        if (indexSize === 1) {
          return buf[i3];
        } else {
          return buf.readUInt16BE(i3 * indexSize);
        }
      }
      let i2;
      if (dir) {
        let foundIndex = -1;
        for (i2 = byteOffset; i2 < arrLength; i2++) {
          if (read(arr, i2) === read(val, foundIndex === -1 ? 0 : i2 - foundIndex)) {
            if (foundIndex === -1)
              foundIndex = i2;
            if (i2 - foundIndex + 1 === valLength)
              return foundIndex * indexSize;
          } else {
            if (foundIndex !== -1)
              i2 -= i2 - foundIndex;
            foundIndex = -1;
          }
        }
      } else {
        if (byteOffset + valLength > arrLength)
          byteOffset = arrLength - valLength;
        for (i2 = byteOffset; i2 >= 0; i2--) {
          let found = true;
          for (let j = 0; j < valLength; j++) {
            if (read(arr, i2 + j) !== read(val, j)) {
              found = false;
              break;
            }
          }
          if (found)
            return i2;
        }
      }
      return -1;
    }
    Buffer2.prototype.includes = function includes(val, byteOffset, encoding) {
      return this.indexOf(val, byteOffset, encoding) !== -1;
    };
    Buffer2.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
    };
    Buffer2.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
    };
    function hexWrite(buf, string, offset, length) {
      offset = Number(offset) || 0;
      const remaining = buf.length - offset;
      if (!length) {
        length = remaining;
      } else {
        length = Number(length);
        if (length > remaining) {
          length = remaining;
        }
      }
      const strLen = string.length;
      if (length > strLen / 2) {
        length = strLen / 2;
      }
      let i2;
      for (i2 = 0; i2 < length; ++i2) {
        const parsed = parseInt(string.substr(i2 * 2, 2), 16);
        if (numberIsNaN(parsed))
          return i2;
        buf[offset + i2] = parsed;
      }
      return i2;
    }
    function utf8Write(buf, string, offset, length) {
      return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
    }
    function asciiWrite(buf, string, offset, length) {
      return blitBuffer(asciiToBytes(string), buf, offset, length);
    }
    function base64Write(buf, string, offset, length) {
      return blitBuffer(base64ToBytes(string), buf, offset, length);
    }
    function ucs2Write(buf, string, offset, length) {
      return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
    }
    Buffer2.prototype.write = function write(string, offset, length, encoding) {
      if (offset === void 0) {
        encoding = "utf8";
        length = this.length;
        offset = 0;
      } else if (length === void 0 && typeof offset === "string") {
        encoding = offset;
        length = this.length;
        offset = 0;
      } else if (isFinite(offset)) {
        offset = offset >>> 0;
        if (isFinite(length)) {
          length = length >>> 0;
          if (encoding === void 0)
            encoding = "utf8";
        } else {
          encoding = length;
          length = void 0;
        }
      } else {
        throw new Error(
          "Buffer.write(string, encoding, offset[, length]) is no longer supported"
        );
      }
      const remaining = this.length - offset;
      if (length === void 0 || length > remaining)
        length = remaining;
      if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) {
        throw new RangeError("Attempt to write outside buffer bounds");
      }
      if (!encoding)
        encoding = "utf8";
      let loweredCase = false;
      for (; ; ) {
        switch (encoding) {
          case "hex":
            return hexWrite(this, string, offset, length);
          case "utf8":
          case "utf-8":
            return utf8Write(this, string, offset, length);
          case "ascii":
          case "latin1":
          case "binary":
            return asciiWrite(this, string, offset, length);
          case "base64":
            return base64Write(this, string, offset, length);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return ucs2Write(this, string, offset, length);
          default:
            if (loweredCase)
              throw new TypeError("Unknown encoding: " + encoding);
            encoding = ("" + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    };
    Buffer2.prototype.toJSON = function toJSON() {
      return {
        type: "Buffer",
        data: Array.prototype.slice.call(this._arr || this, 0)
      };
    };
    function base64Slice(buf, start, end) {
      if (start === 0 && end === buf.length) {
        return base64.fromByteArray(buf);
      } else {
        return base64.fromByteArray(buf.slice(start, end));
      }
    }
    function utf8Slice(buf, start, end) {
      end = Math.min(buf.length, end);
      const res = [];
      let i2 = start;
      while (i2 < end) {
        const firstByte = buf[i2];
        let codePoint = null;
        let bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
        if (i2 + bytesPerSequence <= end) {
          let secondByte, thirdByte, fourthByte, tempCodePoint;
          switch (bytesPerSequence) {
            case 1:
              if (firstByte < 128) {
                codePoint = firstByte;
              }
              break;
            case 2:
              secondByte = buf[i2 + 1];
              if ((secondByte & 192) === 128) {
                tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
                if (tempCodePoint > 127) {
                  codePoint = tempCodePoint;
                }
              }
              break;
            case 3:
              secondByte = buf[i2 + 1];
              thirdByte = buf[i2 + 2];
              if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
                tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
                if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
                  codePoint = tempCodePoint;
                }
              }
              break;
            case 4:
              secondByte = buf[i2 + 1];
              thirdByte = buf[i2 + 2];
              fourthByte = buf[i2 + 3];
              if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
                tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
                if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
                  codePoint = tempCodePoint;
                }
              }
          }
        }
        if (codePoint === null) {
          codePoint = 65533;
          bytesPerSequence = 1;
        } else if (codePoint > 65535) {
          codePoint -= 65536;
          res.push(codePoint >>> 10 & 1023 | 55296);
          codePoint = 56320 | codePoint & 1023;
        }
        res.push(codePoint);
        i2 += bytesPerSequence;
      }
      return decodeCodePointsArray(res);
    }
    const MAX_ARGUMENTS_LENGTH = 4096;
    function decodeCodePointsArray(codePoints) {
      const len2 = codePoints.length;
      if (len2 <= MAX_ARGUMENTS_LENGTH) {
        return String.fromCharCode.apply(String, codePoints);
      }
      let res = "";
      let i2 = 0;
      while (i2 < len2) {
        res += String.fromCharCode.apply(
          String,
          codePoints.slice(i2, i2 += MAX_ARGUMENTS_LENGTH)
        );
      }
      return res;
    }
    function asciiSlice(buf, start, end) {
      let ret = "";
      end = Math.min(buf.length, end);
      for (let i2 = start; i2 < end; ++i2) {
        ret += String.fromCharCode(buf[i2] & 127);
      }
      return ret;
    }
    function latin1Slice(buf, start, end) {
      let ret = "";
      end = Math.min(buf.length, end);
      for (let i2 = start; i2 < end; ++i2) {
        ret += String.fromCharCode(buf[i2]);
      }
      return ret;
    }
    function hexSlice(buf, start, end) {
      const len2 = buf.length;
      if (!start || start < 0)
        start = 0;
      if (!end || end < 0 || end > len2)
        end = len2;
      let out = "";
      for (let i2 = start; i2 < end; ++i2) {
        out += hexSliceLookupTable[buf[i2]];
      }
      return out;
    }
    function utf16leSlice(buf, start, end) {
      const bytes = buf.slice(start, end);
      let res = "";
      for (let i2 = 0; i2 < bytes.length - 1; i2 += 2) {
        res += String.fromCharCode(bytes[i2] + bytes[i2 + 1] * 256);
      }
      return res;
    }
    Buffer2.prototype.slice = function slice(start, end) {
      const len2 = this.length;
      start = ~~start;
      end = end === void 0 ? len2 : ~~end;
      if (start < 0) {
        start += len2;
        if (start < 0)
          start = 0;
      } else if (start > len2) {
        start = len2;
      }
      if (end < 0) {
        end += len2;
        if (end < 0)
          end = 0;
      } else if (end > len2) {
        end = len2;
      }
      if (end < start)
        end = start;
      const newBuf = this.subarray(start, end);
      Object.setPrototypeOf(newBuf, Buffer2.prototype);
      return newBuf;
    };
    function checkOffset(offset, ext, length) {
      if (offset % 1 !== 0 || offset < 0)
        throw new RangeError("offset is not uint");
      if (offset + ext > length)
        throw new RangeError("Trying to access beyond buffer length");
    }
    Buffer2.prototype.readUintLE = Buffer2.prototype.readUIntLE = function readUIntLE(offset, byteLength3, noAssert) {
      offset = offset >>> 0;
      byteLength3 = byteLength3 >>> 0;
      if (!noAssert)
        checkOffset(offset, byteLength3, this.length);
      let val = this[offset];
      let mul = 1;
      let i2 = 0;
      while (++i2 < byteLength3 && (mul *= 256)) {
        val += this[offset + i2] * mul;
      }
      return val;
    };
    Buffer2.prototype.readUintBE = Buffer2.prototype.readUIntBE = function readUIntBE(offset, byteLength3, noAssert) {
      offset = offset >>> 0;
      byteLength3 = byteLength3 >>> 0;
      if (!noAssert) {
        checkOffset(offset, byteLength3, this.length);
      }
      let val = this[offset + --byteLength3];
      let mul = 1;
      while (byteLength3 > 0 && (mul *= 256)) {
        val += this[offset + --byteLength3] * mul;
      }
      return val;
    };
    Buffer2.prototype.readUint8 = Buffer2.prototype.readUInt8 = function readUInt8(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 1, this.length);
      return this[offset];
    };
    Buffer2.prototype.readUint16LE = Buffer2.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 2, this.length);
      return this[offset] | this[offset + 1] << 8;
    };
    Buffer2.prototype.readUint16BE = Buffer2.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 2, this.length);
      return this[offset] << 8 | this[offset + 1];
    };
    Buffer2.prototype.readUint32LE = Buffer2.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 4, this.length);
      return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
    };
    Buffer2.prototype.readUint32BE = Buffer2.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 4, this.length);
      return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
    };
    Buffer2.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE(offset) {
      offset = offset >>> 0;
      validateNumber(offset, "offset");
      const first = this[offset];
      const last = this[offset + 7];
      if (first === void 0 || last === void 0) {
        boundsError(offset, this.length - 8);
      }
      const lo = first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24;
      const hi = this[++offset] + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + last * 2 ** 24;
      return BigInt(lo) + (BigInt(hi) << BigInt(32));
    });
    Buffer2.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE(offset) {
      offset = offset >>> 0;
      validateNumber(offset, "offset");
      const first = this[offset];
      const last = this[offset + 7];
      if (first === void 0 || last === void 0) {
        boundsError(offset, this.length - 8);
      }
      const hi = first * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
      const lo = this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last;
      return (BigInt(hi) << BigInt(32)) + BigInt(lo);
    });
    Buffer2.prototype.readIntLE = function readIntLE(offset, byteLength3, noAssert) {
      offset = offset >>> 0;
      byteLength3 = byteLength3 >>> 0;
      if (!noAssert)
        checkOffset(offset, byteLength3, this.length);
      let val = this[offset];
      let mul = 1;
      let i2 = 0;
      while (++i2 < byteLength3 && (mul *= 256)) {
        val += this[offset + i2] * mul;
      }
      mul *= 128;
      if (val >= mul)
        val -= Math.pow(2, 8 * byteLength3);
      return val;
    };
    Buffer2.prototype.readIntBE = function readIntBE(offset, byteLength3, noAssert) {
      offset = offset >>> 0;
      byteLength3 = byteLength3 >>> 0;
      if (!noAssert)
        checkOffset(offset, byteLength3, this.length);
      let i2 = byteLength3;
      let mul = 1;
      let val = this[offset + --i2];
      while (i2 > 0 && (mul *= 256)) {
        val += this[offset + --i2] * mul;
      }
      mul *= 128;
      if (val >= mul)
        val -= Math.pow(2, 8 * byteLength3);
      return val;
    };
    Buffer2.prototype.readInt8 = function readInt8(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 1, this.length);
      if (!(this[offset] & 128))
        return this[offset];
      return (255 - this[offset] + 1) * -1;
    };
    Buffer2.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 2, this.length);
      const val = this[offset] | this[offset + 1] << 8;
      return val & 32768 ? val | 4294901760 : val;
    };
    Buffer2.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 2, this.length);
      const val = this[offset + 1] | this[offset] << 8;
      return val & 32768 ? val | 4294901760 : val;
    };
    Buffer2.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 4, this.length);
      return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
    };
    Buffer2.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 4, this.length);
      return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
    };
    Buffer2.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE(offset) {
      offset = offset >>> 0;
      validateNumber(offset, "offset");
      const first = this[offset];
      const last = this[offset + 7];
      if (first === void 0 || last === void 0) {
        boundsError(offset, this.length - 8);
      }
      const val = this[offset + 4] + this[offset + 5] * 2 ** 8 + this[offset + 6] * 2 ** 16 + (last << 24);
      return (BigInt(val) << BigInt(32)) + BigInt(first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24);
    });
    Buffer2.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE(offset) {
      offset = offset >>> 0;
      validateNumber(offset, "offset");
      const first = this[offset];
      const last = this[offset + 7];
      if (first === void 0 || last === void 0) {
        boundsError(offset, this.length - 8);
      }
      const val = (first << 24) + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
      return (BigInt(val) << BigInt(32)) + BigInt(this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last);
    });
    Buffer2.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 4, this.length);
      return ieee754$1.read(this, offset, true, 23, 4);
    };
    Buffer2.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 4, this.length);
      return ieee754$1.read(this, offset, false, 23, 4);
    };
    Buffer2.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 8, this.length);
      return ieee754$1.read(this, offset, true, 52, 8);
    };
    Buffer2.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
      offset = offset >>> 0;
      if (!noAssert)
        checkOffset(offset, 8, this.length);
      return ieee754$1.read(this, offset, false, 52, 8);
    };
    function checkInt(buf, value, offset, ext, max, min) {
      if (!Buffer2.isBuffer(buf))
        throw new TypeError('"buffer" argument must be a Buffer instance');
      if (value > max || value < min)
        throw new RangeError('"value" argument is out of bounds');
      if (offset + ext > buf.length)
        throw new RangeError("Index out of range");
    }
    Buffer2.prototype.writeUintLE = Buffer2.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength3, noAssert) {
      value = +value;
      offset = offset >>> 0;
      byteLength3 = byteLength3 >>> 0;
      if (!noAssert) {
        const maxBytes = Math.pow(2, 8 * byteLength3) - 1;
        checkInt(this, value, offset, byteLength3, maxBytes, 0);
      }
      let mul = 1;
      let i2 = 0;
      this[offset] = value & 255;
      while (++i2 < byteLength3 && (mul *= 256)) {
        this[offset + i2] = value / mul & 255;
      }
      return offset + byteLength3;
    };
    Buffer2.prototype.writeUintBE = Buffer2.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength3, noAssert) {
      value = +value;
      offset = offset >>> 0;
      byteLength3 = byteLength3 >>> 0;
      if (!noAssert) {
        const maxBytes = Math.pow(2, 8 * byteLength3) - 1;
        checkInt(this, value, offset, byteLength3, maxBytes, 0);
      }
      let i2 = byteLength3 - 1;
      let mul = 1;
      this[offset + i2] = value & 255;
      while (--i2 >= 0 && (mul *= 256)) {
        this[offset + i2] = value / mul & 255;
      }
      return offset + byteLength3;
    };
    Buffer2.prototype.writeUint8 = Buffer2.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert)
        checkInt(this, value, offset, 1, 255, 0);
      this[offset] = value & 255;
      return offset + 1;
    };
    Buffer2.prototype.writeUint16LE = Buffer2.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert)
        checkInt(this, value, offset, 2, 65535, 0);
      this[offset] = value & 255;
      this[offset + 1] = value >>> 8;
      return offset + 2;
    };
    Buffer2.prototype.writeUint16BE = Buffer2.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert)
        checkInt(this, value, offset, 2, 65535, 0);
      this[offset] = value >>> 8;
      this[offset + 1] = value & 255;
      return offset + 2;
    };
    Buffer2.prototype.writeUint32LE = Buffer2.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert)
        checkInt(this, value, offset, 4, 4294967295, 0);
      this[offset + 3] = value >>> 24;
      this[offset + 2] = value >>> 16;
      this[offset + 1] = value >>> 8;
      this[offset] = value & 255;
      return offset + 4;
    };
    Buffer2.prototype.writeUint32BE = Buffer2.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert)
        checkInt(this, value, offset, 4, 4294967295, 0);
      this[offset] = value >>> 24;
      this[offset + 1] = value >>> 16;
      this[offset + 2] = value >>> 8;
      this[offset + 3] = value & 255;
      return offset + 4;
    };
    function wrtBigUInt64LE(buf, value, offset, min, max) {
      checkIntBI(value, min, max, buf, offset, 7);
      let lo = Number(value & BigInt(4294967295));
      buf[offset++] = lo;
      lo = lo >> 8;
      buf[offset++] = lo;
      lo = lo >> 8;
      buf[offset++] = lo;
      lo = lo >> 8;
      buf[offset++] = lo;
      let hi = Number(value >> BigInt(32) & BigInt(4294967295));
      buf[offset++] = hi;
      hi = hi >> 8;
      buf[offset++] = hi;
      hi = hi >> 8;
      buf[offset++] = hi;
      hi = hi >> 8;
      buf[offset++] = hi;
      return offset;
    }
    function wrtBigUInt64BE(buf, value, offset, min, max) {
      checkIntBI(value, min, max, buf, offset, 7);
      let lo = Number(value & BigInt(4294967295));
      buf[offset + 7] = lo;
      lo = lo >> 8;
      buf[offset + 6] = lo;
      lo = lo >> 8;
      buf[offset + 5] = lo;
      lo = lo >> 8;
      buf[offset + 4] = lo;
      let hi = Number(value >> BigInt(32) & BigInt(4294967295));
      buf[offset + 3] = hi;
      hi = hi >> 8;
      buf[offset + 2] = hi;
      hi = hi >> 8;
      buf[offset + 1] = hi;
      hi = hi >> 8;
      buf[offset] = hi;
      return offset + 8;
    }
    Buffer2.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE(value, offset = 0) {
      return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
    });
    Buffer2.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE(value, offset = 0) {
      return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
    });
    Buffer2.prototype.writeIntLE = function writeIntLE(value, offset, byteLength3, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        const limit = Math.pow(2, 8 * byteLength3 - 1);
        checkInt(this, value, offset, byteLength3, limit - 1, -limit);
      }
      let i2 = 0;
      let mul = 1;
      let sub = 0;
      this[offset] = value & 255;
      while (++i2 < byteLength3 && (mul *= 256)) {
        if (value < 0 && sub === 0 && this[offset + i2 - 1] !== 0) {
          sub = 1;
        }
        this[offset + i2] = (value / mul >> 0) - sub & 255;
      }
      return offset + byteLength3;
    };
    Buffer2.prototype.writeIntBE = function writeIntBE(value, offset, byteLength3, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        const limit = Math.pow(2, 8 * byteLength3 - 1);
        checkInt(this, value, offset, byteLength3, limit - 1, -limit);
      }
      let i2 = byteLength3 - 1;
      let mul = 1;
      let sub = 0;
      this[offset + i2] = value & 255;
      while (--i2 >= 0 && (mul *= 256)) {
        if (value < 0 && sub === 0 && this[offset + i2 + 1] !== 0) {
          sub = 1;
        }
        this[offset + i2] = (value / mul >> 0) - sub & 255;
      }
      return offset + byteLength3;
    };
    Buffer2.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert)
        checkInt(this, value, offset, 1, 127, -128);
      if (value < 0)
        value = 255 + value + 1;
      this[offset] = value & 255;
      return offset + 1;
    };
    Buffer2.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert)
        checkInt(this, value, offset, 2, 32767, -32768);
      this[offset] = value & 255;
      this[offset + 1] = value >>> 8;
      return offset + 2;
    };
    Buffer2.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert)
        checkInt(this, value, offset, 2, 32767, -32768);
      this[offset] = value >>> 8;
      this[offset + 1] = value & 255;
      return offset + 2;
    };
    Buffer2.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert)
        checkInt(this, value, offset, 4, 2147483647, -2147483648);
      this[offset] = value & 255;
      this[offset + 1] = value >>> 8;
      this[offset + 2] = value >>> 16;
      this[offset + 3] = value >>> 24;
      return offset + 4;
    };
    Buffer2.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert)
        checkInt(this, value, offset, 4, 2147483647, -2147483648);
      if (value < 0)
        value = 4294967295 + value + 1;
      this[offset] = value >>> 24;
      this[offset + 1] = value >>> 16;
      this[offset + 2] = value >>> 8;
      this[offset + 3] = value & 255;
      return offset + 4;
    };
    Buffer2.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE(value, offset = 0) {
      return wrtBigUInt64LE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
    });
    Buffer2.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE(value, offset = 0) {
      return wrtBigUInt64BE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
    });
    function checkIEEE754(buf, value, offset, ext, max, min) {
      if (offset + ext > buf.length)
        throw new RangeError("Index out of range");
      if (offset < 0)
        throw new RangeError("Index out of range");
    }
    function writeFloat(buf, value, offset, littleEndian, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 4);
      }
      ieee754$1.write(buf, value, offset, littleEndian, 23, 4);
      return offset + 4;
    }
    Buffer2.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
      return writeFloat(this, value, offset, true, noAssert);
    };
    Buffer2.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
      return writeFloat(this, value, offset, false, noAssert);
    };
    function writeDouble(buf, value, offset, littleEndian, noAssert) {
      value = +value;
      offset = offset >>> 0;
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 8);
      }
      ieee754$1.write(buf, value, offset, littleEndian, 52, 8);
      return offset + 8;
    }
    Buffer2.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
      return writeDouble(this, value, offset, true, noAssert);
    };
    Buffer2.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
      return writeDouble(this, value, offset, false, noAssert);
    };
    Buffer2.prototype.copy = function copy(target, targetStart, start, end) {
      if (!Buffer2.isBuffer(target))
        throw new TypeError("argument should be a Buffer");
      if (!start)
        start = 0;
      if (!end && end !== 0)
        end = this.length;
      if (targetStart >= target.length)
        targetStart = target.length;
      if (!targetStart)
        targetStart = 0;
      if (end > 0 && end < start)
        end = start;
      if (end === start)
        return 0;
      if (target.length === 0 || this.length === 0)
        return 0;
      if (targetStart < 0) {
        throw new RangeError("targetStart out of bounds");
      }
      if (start < 0 || start >= this.length)
        throw new RangeError("Index out of range");
      if (end < 0)
        throw new RangeError("sourceEnd out of bounds");
      if (end > this.length)
        end = this.length;
      if (target.length - targetStart < end - start) {
        end = target.length - targetStart + start;
      }
      const len2 = end - start;
      if (this === target && typeof Uint8Array.prototype.copyWithin === "function") {
        this.copyWithin(targetStart, start, end);
      } else {
        Uint8Array.prototype.set.call(
          target,
          this.subarray(start, end),
          targetStart
        );
      }
      return len2;
    };
    Buffer2.prototype.fill = function fill(val, start, end, encoding) {
      if (typeof val === "string") {
        if (typeof start === "string") {
          encoding = start;
          start = 0;
          end = this.length;
        } else if (typeof end === "string") {
          encoding = end;
          end = this.length;
        }
        if (encoding !== void 0 && typeof encoding !== "string") {
          throw new TypeError("encoding must be a string");
        }
        if (typeof encoding === "string" && !Buffer2.isEncoding(encoding)) {
          throw new TypeError("Unknown encoding: " + encoding);
        }
        if (val.length === 1) {
          const code2 = val.charCodeAt(0);
          if (encoding === "utf8" && code2 < 128 || encoding === "latin1") {
            val = code2;
          }
        }
      } else if (typeof val === "number") {
        val = val & 255;
      } else if (typeof val === "boolean") {
        val = Number(val);
      }
      if (start < 0 || this.length < start || this.length < end) {
        throw new RangeError("Out of range index");
      }
      if (end <= start) {
        return this;
      }
      start = start >>> 0;
      end = end === void 0 ? this.length : end >>> 0;
      if (!val)
        val = 0;
      let i2;
      if (typeof val === "number") {
        for (i2 = start; i2 < end; ++i2) {
          this[i2] = val;
        }
      } else {
        const bytes = Buffer2.isBuffer(val) ? val : Buffer2.from(val, encoding);
        const len2 = bytes.length;
        if (len2 === 0) {
          throw new TypeError('The value "' + val + '" is invalid for argument "value"');
        }
        for (i2 = 0; i2 < end - start; ++i2) {
          this[i2 + start] = bytes[i2 % len2];
        }
      }
      return this;
    };
    const errors = {};
    function E(sym, getMessage, Base) {
      errors[sym] = class NodeError extends Base {
        constructor() {
          super();
          Object.defineProperty(this, "message", {
            value: getMessage.apply(this, arguments),
            writable: true,
            configurable: true
          });
          this.name = `${this.name} [${sym}]`;
          this.stack;
          delete this.name;
        }
        get code() {
          return sym;
        }
        set code(value) {
          Object.defineProperty(this, "code", {
            configurable: true,
            enumerable: true,
            value,
            writable: true
          });
        }
        toString() {
          return `${this.name} [${sym}]: ${this.message}`;
        }
      };
    }
    E(
      "ERR_BUFFER_OUT_OF_BOUNDS",
      function(name) {
        if (name) {
          return `${name} is outside of buffer bounds`;
        }
        return "Attempt to access memory outside buffer bounds";
      },
      RangeError
    );
    E(
      "ERR_INVALID_ARG_TYPE",
      function(name, actual) {
        return `The "${name}" argument must be of type number. Received type ${typeof actual}`;
      },
      TypeError
    );
    E(
      "ERR_OUT_OF_RANGE",
      function(str, range, input) {
        let msg = `The value of "${str}" is out of range.`;
        let received = input;
        if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
          received = addNumericalSeparator(String(input));
        } else if (typeof input === "bigint") {
          received = String(input);
          if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
            received = addNumericalSeparator(received);
          }
          received += "n";
        }
        msg += ` It must be ${range}. Received ${received}`;
        return msg;
      },
      RangeError
    );
    function addNumericalSeparator(val) {
      let res = "";
      let i2 = val.length;
      const start = val[0] === "-" ? 1 : 0;
      for (; i2 >= start + 4; i2 -= 3) {
        res = `_${val.slice(i2 - 3, i2)}${res}`;
      }
      return `${val.slice(0, i2)}${res}`;
    }
    function checkBounds(buf, offset, byteLength3) {
      validateNumber(offset, "offset");
      if (buf[offset] === void 0 || buf[offset + byteLength3] === void 0) {
        boundsError(offset, buf.length - (byteLength3 + 1));
      }
    }
    function checkIntBI(value, min, max, buf, offset, byteLength3) {
      if (value > max || value < min) {
        const n = typeof min === "bigint" ? "n" : "";
        let range;
        if (byteLength3 > 3) {
          if (min === 0 || min === BigInt(0)) {
            range = `>= 0${n} and < 2${n} ** ${(byteLength3 + 1) * 8}${n}`;
          } else {
            range = `>= -(2${n} ** ${(byteLength3 + 1) * 8 - 1}${n}) and < 2 ** ${(byteLength3 + 1) * 8 - 1}${n}`;
          }
        } else {
          range = `>= ${min}${n} and <= ${max}${n}`;
        }
        throw new errors.ERR_OUT_OF_RANGE("value", range, value);
      }
      checkBounds(buf, offset, byteLength3);
    }
    function validateNumber(value, name) {
      if (typeof value !== "number") {
        throw new errors.ERR_INVALID_ARG_TYPE(name, "number", value);
      }
    }
    function boundsError(value, length, type) {
      if (Math.floor(value) !== value) {
        validateNumber(value, type);
        throw new errors.ERR_OUT_OF_RANGE(type || "offset", "an integer", value);
      }
      if (length < 0) {
        throw new errors.ERR_BUFFER_OUT_OF_BOUNDS();
      }
      throw new errors.ERR_OUT_OF_RANGE(
        type || "offset",
        `>= ${type ? 1 : 0} and <= ${length}`,
        value
      );
    }
    const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
    function base64clean(str) {
      str = str.split("=")[0];
      str = str.trim().replace(INVALID_BASE64_RE, "");
      if (str.length < 2)
        return "";
      while (str.length % 4 !== 0) {
        str = str + "=";
      }
      return str;
    }
    function utf8ToBytes(string, units) {
      units = units || Infinity;
      let codePoint;
      const length = string.length;
      let leadSurrogate = null;
      const bytes = [];
      for (let i2 = 0; i2 < length; ++i2) {
        codePoint = string.charCodeAt(i2);
        if (codePoint > 55295 && codePoint < 57344) {
          if (!leadSurrogate) {
            if (codePoint > 56319) {
              if ((units -= 3) > -1)
                bytes.push(239, 191, 189);
              continue;
            } else if (i2 + 1 === length) {
              if ((units -= 3) > -1)
                bytes.push(239, 191, 189);
              continue;
            }
            leadSurrogate = codePoint;
            continue;
          }
          if (codePoint < 56320) {
            if ((units -= 3) > -1)
              bytes.push(239, 191, 189);
            leadSurrogate = codePoint;
            continue;
          }
          codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
        } else if (leadSurrogate) {
          if ((units -= 3) > -1)
            bytes.push(239, 191, 189);
        }
        leadSurrogate = null;
        if (codePoint < 128) {
          if ((units -= 1) < 0)
            break;
          bytes.push(codePoint);
        } else if (codePoint < 2048) {
          if ((units -= 2) < 0)
            break;
          bytes.push(
            codePoint >> 6 | 192,
            codePoint & 63 | 128
          );
        } else if (codePoint < 65536) {
          if ((units -= 3) < 0)
            break;
          bytes.push(
            codePoint >> 12 | 224,
            codePoint >> 6 & 63 | 128,
            codePoint & 63 | 128
          );
        } else if (codePoint < 1114112) {
          if ((units -= 4) < 0)
            break;
          bytes.push(
            codePoint >> 18 | 240,
            codePoint >> 12 & 63 | 128,
            codePoint >> 6 & 63 | 128,
            codePoint & 63 | 128
          );
        } else {
          throw new Error("Invalid code point");
        }
      }
      return bytes;
    }
    function asciiToBytes(str) {
      const byteArray = [];
      for (let i2 = 0; i2 < str.length; ++i2) {
        byteArray.push(str.charCodeAt(i2) & 255);
      }
      return byteArray;
    }
    function utf16leToBytes(str, units) {
      let c, hi, lo;
      const byteArray = [];
      for (let i2 = 0; i2 < str.length; ++i2) {
        if ((units -= 2) < 0)
          break;
        c = str.charCodeAt(i2);
        hi = c >> 8;
        lo = c % 256;
        byteArray.push(lo);
        byteArray.push(hi);
      }
      return byteArray;
    }
    function base64ToBytes(str) {
      return base64.toByteArray(base64clean(str));
    }
    function blitBuffer(src2, dst, offset, length) {
      let i2;
      for (i2 = 0; i2 < length; ++i2) {
        if (i2 + offset >= dst.length || i2 >= src2.length)
          break;
        dst[i2 + offset] = src2[i2];
      }
      return i2;
    }
    function isInstance(obj, type) {
      return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
    }
    function numberIsNaN(obj) {
      return obj !== obj;
    }
    const hexSliceLookupTable = function() {
      const alphabet = "0123456789abcdef";
      const table = new Array(256);
      for (let i2 = 0; i2 < 16; ++i2) {
        const i16 = i2 * 16;
        for (let j = 0; j < 16; ++j) {
          table[i16 + j] = alphabet[i2] + alphabet[j];
        }
      }
      return table;
    }();
    function defineBigIntMethod(fn) {
      return typeof BigInt === "undefined" ? BufferBigIntNotDefined : fn;
    }
    function BufferBigIntNotDefined() {
      throw new Error("BigInt not supported");
    }
  })(buffer);
  /*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
  (function(module2, exports3) {
    var buffer$1 = buffer;
    var Buffer2 = buffer$1.Buffer;
    function copyProps(src2, dst) {
      for (var key in src2) {
        dst[key] = src2[key];
      }
    }
    if (Buffer2.from && Buffer2.alloc && Buffer2.allocUnsafe && Buffer2.allocUnsafeSlow) {
      module2.exports = buffer$1;
    } else {
      copyProps(buffer$1, exports3);
      exports3.Buffer = SafeBuffer;
    }
    function SafeBuffer(arg, encodingOrOffset, length) {
      return Buffer2(arg, encodingOrOffset, length);
    }
    SafeBuffer.prototype = Object.create(Buffer2.prototype);
    copyProps(Buffer2, SafeBuffer);
    SafeBuffer.from = function(arg, encodingOrOffset, length) {
      if (typeof arg === "number") {
        throw new TypeError("Argument must not be a number");
      }
      return Buffer2(arg, encodingOrOffset, length);
    };
    SafeBuffer.alloc = function(size, fill, encoding) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      var buf = Buffer2(size);
      if (fill !== void 0) {
        if (typeof encoding === "string") {
          buf.fill(fill, encoding);
        } else {
          buf.fill(fill);
        }
      } else {
        buf.fill(0);
      }
      return buf;
    };
    SafeBuffer.allocUnsafe = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return Buffer2(size);
    };
    SafeBuffer.allocUnsafeSlow = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return buffer$1.SlowBuffer(size);
    };
  })(safeBuffer, safeBuffer.exports);
  var _Buffer = safeBuffer.exports.Buffer;
  function base(ALPHABET2) {
    if (ALPHABET2.length >= 255) {
      throw new TypeError("Alphabet too long");
    }
    var BASE_MAP = new Uint8Array(256);
    for (var j = 0; j < BASE_MAP.length; j++) {
      BASE_MAP[j] = 255;
    }
    for (var i2 = 0; i2 < ALPHABET2.length; i2++) {
      var x = ALPHABET2.charAt(i2);
      var xc = x.charCodeAt(0);
      if (BASE_MAP[xc] !== 255) {
        throw new TypeError(x + " is ambiguous");
      }
      BASE_MAP[xc] = i2;
    }
    var BASE = ALPHABET2.length;
    var LEADER = ALPHABET2.charAt(0);
    var FACTOR = Math.log(BASE) / Math.log(256);
    var iFACTOR = Math.log(256) / Math.log(BASE);
    function encode(source) {
      if (Array.isArray(source) || source instanceof Uint8Array) {
        source = _Buffer.from(source);
      }
      if (!_Buffer.isBuffer(source)) {
        throw new TypeError("Expected Buffer");
      }
      if (source.length === 0) {
        return "";
      }
      var zeroes = 0;
      var length = 0;
      var pbegin = 0;
      var pend = source.length;
      while (pbegin !== pend && source[pbegin] === 0) {
        pbegin++;
        zeroes++;
      }
      var size = (pend - pbegin) * iFACTOR + 1 >>> 0;
      var b58 = new Uint8Array(size);
      while (pbegin !== pend) {
        var carry = source[pbegin];
        var i3 = 0;
        for (var it1 = size - 1; (carry !== 0 || i3 < length) && it1 !== -1; it1--, i3++) {
          carry += 256 * b58[it1] >>> 0;
          b58[it1] = carry % BASE >>> 0;
          carry = carry / BASE >>> 0;
        }
        if (carry !== 0) {
          throw new Error("Non-zero carry");
        }
        length = i3;
        pbegin++;
      }
      var it2 = size - length;
      while (it2 !== size && b58[it2] === 0) {
        it2++;
      }
      var str = LEADER.repeat(zeroes);
      for (; it2 < size; ++it2) {
        str += ALPHABET2.charAt(b58[it2]);
      }
      return str;
    }
    function decodeUnsafe(source) {
      if (typeof source !== "string") {
        throw new TypeError("Expected String");
      }
      if (source.length === 0) {
        return _Buffer.alloc(0);
      }
      var psz = 0;
      var zeroes = 0;
      var length = 0;
      while (source[psz] === LEADER) {
        zeroes++;
        psz++;
      }
      var size = (source.length - psz) * FACTOR + 1 >>> 0;
      var b256 = new Uint8Array(size);
      while (source[psz]) {
        var carry = BASE_MAP[source.charCodeAt(psz)];
        if (carry === 255) {
          return;
        }
        var i3 = 0;
        for (var it3 = size - 1; (carry !== 0 || i3 < length) && it3 !== -1; it3--, i3++) {
          carry += BASE * b256[it3] >>> 0;
          b256[it3] = carry % 256 >>> 0;
          carry = carry / 256 >>> 0;
        }
        if (carry !== 0) {
          throw new Error("Non-zero carry");
        }
        length = i3;
        psz++;
      }
      var it4 = size - length;
      while (it4 !== size && b256[it4] === 0) {
        it4++;
      }
      var vch = _Buffer.allocUnsafe(zeroes + (size - it4));
      vch.fill(0, 0, zeroes);
      var j2 = zeroes;
      while (it4 !== size) {
        vch[j2++] = b256[it4++];
      }
      return vch;
    }
    function decode(string) {
      var buffer2 = decodeUnsafe(string);
      if (buffer2) {
        return buffer2;
      }
      throw new Error("Non-base" + BASE + " character");
    }
    return {
      encode,
      decodeUnsafe,
      decode
    };
  }
  var src = base;
  var basex = src;
  var ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  var bs58 = basex(ALPHABET);
  function isVersionedTransaction(transaction) {
    return "version" in transaction;
  }
  var __classPrivateFieldSet$1 = globalThis && globalThis.__classPrivateFieldSet || function(receiver, state, value, kind, f) {
    if (kind === "m")
      throw new TypeError("Private method is not writable");
    if (kind === "a" && !f)
      throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
      throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
  };
  var __classPrivateFieldGet$1 = globalThis && globalThis.__classPrivateFieldGet || function(receiver, state, kind, f) {
    if (kind === "a" && !f)
      throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
      throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
  };
  var _StandardWalletAdapter_instances, _StandardWalletAdapter_account, _StandardWalletAdapter_publicKey, _StandardWalletAdapter_connecting, _StandardWalletAdapter_off, _StandardWalletAdapter_wallet, _StandardWalletAdapter_supportedTransactionVersions, _StandardWalletAdapter_readyState, _StandardWalletAdapter_connected, _StandardWalletAdapter_disconnected, _StandardWalletAdapter_changed, _StandardWalletAdapter_signTransaction, _StandardWalletAdapter_signAllTransactions, _StandardWalletAdapter_signMessage;
  function isWalletAdapterCompatibleWallet(wallet) {
    return "standard:connect" in wallet.features && "standard:events" in wallet.features && ("solana:signAndSendTransaction" in wallet.features || "solana:signTransaction" in wallet.features);
  }
  class StandardWalletAdapter extends walletAdapterBase.BaseWalletAdapter {
    constructor({ wallet }) {
      super();
      _StandardWalletAdapter_instances.add(this);
      _StandardWalletAdapter_account.set(this, void 0);
      _StandardWalletAdapter_publicKey.set(this, void 0);
      _StandardWalletAdapter_connecting.set(this, void 0);
      _StandardWalletAdapter_off.set(this, void 0);
      _StandardWalletAdapter_wallet.set(this, void 0);
      _StandardWalletAdapter_supportedTransactionVersions.set(this, void 0);
      _StandardWalletAdapter_readyState.set(this, typeof window === "undefined" || typeof document === "undefined" ? walletAdapterBase.WalletReadyState.Unsupported : walletAdapterBase.WalletReadyState.Installed);
      _StandardWalletAdapter_changed.set(this, (properties) => {
        if (!__classPrivateFieldGet$1(this, _StandardWalletAdapter_account, "f") || !__classPrivateFieldGet$1(this, _StandardWalletAdapter_publicKey, "f") || !("accounts" in properties))
          return;
        const account = __classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f").accounts[0];
        if (!account) {
          __classPrivateFieldGet$1(this, _StandardWalletAdapter_instances, "m", _StandardWalletAdapter_disconnected).call(this);
          this.emit("error", new walletAdapterBase.WalletDisconnectedError());
          this.emit("disconnect");
          return;
        }
        if (account === __classPrivateFieldGet$1(this, _StandardWalletAdapter_account, "f"))
          return;
        let publicKey;
        try {
          publicKey = new web3_js.PublicKey(account.publicKey);
        } catch (error) {
          __classPrivateFieldGet$1(this, _StandardWalletAdapter_instances, "m", _StandardWalletAdapter_disconnected).call(this);
          this.emit("error", new walletAdapterBase.WalletPublicKeyError(error == null ? void 0 : error.message));
          this.emit("disconnect");
          return;
        }
        __classPrivateFieldGet$1(this, _StandardWalletAdapter_instances, "m", _StandardWalletAdapter_connected).call(this, account, publicKey);
        this.emit("connect", publicKey);
      });
      __classPrivateFieldSet$1(this, _StandardWalletAdapter_wallet, wallet, "f");
      const supportedTransactionVersions = "solana:signAndSendTransaction" in wallet.features ? wallet.features["solana:signAndSendTransaction"].supportedTransactionVersions : wallet.features["solana:signTransaction"].supportedTransactionVersions;
      __classPrivateFieldSet$1(this, _StandardWalletAdapter_supportedTransactionVersions, arraysEqual(supportedTransactionVersions, ["legacy"]) ? null : new Set(supportedTransactionVersions), "f");
      __classPrivateFieldSet$1(this, _StandardWalletAdapter_account, null, "f");
      __classPrivateFieldSet$1(this, _StandardWalletAdapter_publicKey, null, "f");
      __classPrivateFieldSet$1(this, _StandardWalletAdapter_connecting, false, "f");
    }
    get supportedTransactionVersions() {
      return __classPrivateFieldGet$1(this, _StandardWalletAdapter_supportedTransactionVersions, "f");
    }
    get name() {
      return __classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f").name;
    }
    get icon() {
      return __classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f").icon;
    }
    get url() {
      return "https://github.com/wallet-standard";
    }
    get publicKey() {
      return __classPrivateFieldGet$1(this, _StandardWalletAdapter_publicKey, "f");
    }
    get connecting() {
      return __classPrivateFieldGet$1(this, _StandardWalletAdapter_connecting, "f");
    }
    get readyState() {
      return __classPrivateFieldGet$1(this, _StandardWalletAdapter_readyState, "f");
    }
    get wallet() {
      return __classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f");
    }
    get standard() {
      return true;
    }
    async connect() {
      try {
        if (this.connected || this.connecting)
          return;
        if (__classPrivateFieldGet$1(this, _StandardWalletAdapter_readyState, "f") !== walletAdapterBase.WalletReadyState.Installed)
          throw new walletAdapterBase.WalletNotReadyError();
        __classPrivateFieldSet$1(this, _StandardWalletAdapter_connecting, true, "f");
        if (!__classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f").accounts.length) {
          try {
            await __classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f").features["standard:connect"].connect();
          } catch (error) {
            throw new walletAdapterBase.WalletConnectionError(error == null ? void 0 : error.message, error);
          }
        }
        if (!__classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f").accounts.length)
          throw new walletAdapterBase.WalletAccountError();
        const account = __classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f").accounts[0];
        let publicKey;
        try {
          publicKey = new web3_js.PublicKey(account.publicKey);
        } catch (error) {
          throw new walletAdapterBase.WalletPublicKeyError(error == null ? void 0 : error.message, error);
        }
        __classPrivateFieldSet$1(this, _StandardWalletAdapter_off, __classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f").features["standard:events"].on("change", __classPrivateFieldGet$1(this, _StandardWalletAdapter_changed, "f")), "f");
        __classPrivateFieldGet$1(this, _StandardWalletAdapter_instances, "m", _StandardWalletAdapter_connected).call(this, account, publicKey);
        this.emit("connect", publicKey);
      } catch (error) {
        this.emit("error", error);
        throw error;
      } finally {
        __classPrivateFieldSet$1(this, _StandardWalletAdapter_connecting, false, "f");
      }
    }
    async disconnect() {
      if ("standard:disconnect" in __classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f").features) {
        try {
          await __classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f").features["standard:disconnect"].disconnect();
        } catch (error) {
          this.emit("error", new walletAdapterBase.WalletDisconnectionError(error == null ? void 0 : error.message, error));
        }
      }
      __classPrivateFieldGet$1(this, _StandardWalletAdapter_instances, "m", _StandardWalletAdapter_disconnected).call(this);
      this.emit("disconnect");
    }
    async sendTransaction(transaction, connection, options = {}) {
      try {
        const account = __classPrivateFieldGet$1(this, _StandardWalletAdapter_account, "f");
        if (!account)
          throw new walletAdapterBase.WalletNotConnectedError();
        let feature;
        if ("solana:signAndSendTransaction" in __classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f").features) {
          if (account.features.includes("solana:signAndSendTransaction")) {
            feature = "solana:signAndSendTransaction";
          } else if ("solana:signTransaction" in __classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f").features && account.features.includes("solana:signTransaction")) {
            feature = "solana:signTransaction";
          } else {
            throw new walletAdapterBase.WalletAccountError();
          }
        } else if ("solana:signTransaction" in __classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f").features) {
          if (!account.features.includes("solana:signTransaction"))
            throw new walletAdapterBase.WalletAccountError();
          feature = "solana:signTransaction";
        } else {
          throw new walletAdapterBase.WalletConfigError();
        }
        const chain = getChainForEndpoint(connection.rpcEndpoint);
        if (!account.chains.includes(chain))
          throw new walletAdapterBase.WalletSendTransactionError();
        try {
          const { signers, ...sendOptions } = options;
          let serializedTransaction;
          if (isVersionedTransaction(transaction)) {
            (signers == null ? void 0 : signers.length) && transaction.sign(signers);
            serializedTransaction = transaction.serialize();
          } else {
            transaction = await this.prepareTransaction(transaction, connection, sendOptions);
            (signers == null ? void 0 : signers.length) && transaction.partialSign(...signers);
            serializedTransaction = new Uint8Array(transaction.serialize({
              requireAllSignatures: false,
              verifySignatures: false
            }));
          }
          if (feature === "solana:signAndSendTransaction") {
            const [output] = await __classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f").features["solana:signAndSendTransaction"].signAndSendTransaction({
              account,
              chain,
              transaction: serializedTransaction,
              options: {
                preflightCommitment: getCommitment(sendOptions.preflightCommitment || connection.commitment),
                skipPreflight: sendOptions.skipPreflight,
                maxRetries: sendOptions.maxRetries,
                minContextSlot: sendOptions.minContextSlot
              }
            });
            return bs58.encode(output.signature);
          } else {
            const [output] = await __classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f").features["solana:signTransaction"].signTransaction({
              account,
              chain,
              transaction: serializedTransaction,
              options: {
                preflightCommitment: getCommitment(sendOptions.preflightCommitment || connection.commitment),
                minContextSlot: sendOptions.minContextSlot
              }
            });
            return await connection.sendRawTransaction(output.signedTransaction, {
              ...sendOptions,
              preflightCommitment: getCommitment(sendOptions.preflightCommitment || connection.commitment)
            });
          }
        } catch (error) {
          if (error instanceof walletAdapterBase.WalletError)
            throw error;
          throw new walletAdapterBase.WalletSendTransactionError(error == null ? void 0 : error.message, error);
        }
      } catch (error) {
        this.emit("error", error);
        throw error;
      }
    }
  }
  _StandardWalletAdapter_account = /* @__PURE__ */ new WeakMap(), _StandardWalletAdapter_publicKey = /* @__PURE__ */ new WeakMap(), _StandardWalletAdapter_connecting = /* @__PURE__ */ new WeakMap(), _StandardWalletAdapter_off = /* @__PURE__ */ new WeakMap(), _StandardWalletAdapter_wallet = /* @__PURE__ */ new WeakMap(), _StandardWalletAdapter_supportedTransactionVersions = /* @__PURE__ */ new WeakMap(), _StandardWalletAdapter_readyState = /* @__PURE__ */ new WeakMap(), _StandardWalletAdapter_changed = /* @__PURE__ */ new WeakMap(), _StandardWalletAdapter_instances = /* @__PURE__ */ new WeakSet(), _StandardWalletAdapter_connected = function _StandardWalletAdapter_connected2(account, publicKey) {
    __classPrivateFieldSet$1(this, _StandardWalletAdapter_account, account, "f");
    __classPrivateFieldSet$1(this, _StandardWalletAdapter_publicKey, publicKey, "f");
    if (account == null ? void 0 : account.features.includes("solana:signTransaction")) {
      this.signTransaction = __classPrivateFieldGet$1(this, _StandardWalletAdapter_instances, "m", _StandardWalletAdapter_signTransaction);
      this.signAllTransactions = __classPrivateFieldGet$1(this, _StandardWalletAdapter_instances, "m", _StandardWalletAdapter_signAllTransactions);
    } else {
      delete this.signTransaction;
      delete this.signAllTransactions;
    }
    if (account == null ? void 0 : account.features.includes("solana:signMessage")) {
      this.signMessage = __classPrivateFieldGet$1(this, _StandardWalletAdapter_instances, "m", _StandardWalletAdapter_signMessage);
    } else {
      delete this.signMessage;
    }
  }, _StandardWalletAdapter_disconnected = function _StandardWalletAdapter_disconnected2() {
    const off = __classPrivateFieldGet$1(this, _StandardWalletAdapter_off, "f");
    if (off) {
      __classPrivateFieldSet$1(this, _StandardWalletAdapter_off, void 0, "f");
      off();
    }
    __classPrivateFieldGet$1(this, _StandardWalletAdapter_instances, "m", _StandardWalletAdapter_connected).call(this, null, null);
  }, _StandardWalletAdapter_signTransaction = async function _StandardWalletAdapter_signTransaction2(transaction) {
    try {
      const account = __classPrivateFieldGet$1(this, _StandardWalletAdapter_account, "f");
      if (!account)
        throw new walletAdapterBase.WalletNotConnectedError();
      if (!("solana:signTransaction" in __classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f").features))
        throw new walletAdapterBase.WalletConfigError();
      if (!account.features.includes("solana:signTransaction"))
        throw new walletAdapterBase.WalletAccountError();
      try {
        const signedTransactions = await __classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f").features["solana:signTransaction"].signTransaction({
          account,
          transaction: isVersionedTransaction(transaction) ? transaction.serialize() : new Uint8Array(transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false
          }))
        });
        const serializedTransaction = signedTransactions[0].signedTransaction;
        return isVersionedTransaction(transaction) ? web3_js.VersionedTransaction.deserialize(serializedTransaction) : web3_js.Transaction.from(serializedTransaction);
      } catch (error) {
        if (error instanceof walletAdapterBase.WalletError)
          throw error;
        throw new walletAdapterBase.WalletSignTransactionError(error == null ? void 0 : error.message, error);
      }
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }, _StandardWalletAdapter_signAllTransactions = async function _StandardWalletAdapter_signAllTransactions2(transactions) {
    try {
      const account = __classPrivateFieldGet$1(this, _StandardWalletAdapter_account, "f");
      if (!account)
        throw new walletAdapterBase.WalletNotConnectedError();
      if (!("solana:signTransaction" in __classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f").features))
        throw new walletAdapterBase.WalletConfigError();
      if (!account.features.includes("solana:signTransaction"))
        throw new walletAdapterBase.WalletSignTransactionError();
      try {
        const signedTransactions = await __classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f").features["solana:signTransaction"].signTransaction(...transactions.map((transaction) => ({
          account,
          transaction: isVersionedTransaction(transaction) ? transaction.serialize() : new Uint8Array(transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false
          }))
        })));
        return transactions.map((transaction, index2) => {
          const signedTransaction = signedTransactions[index2].signedTransaction;
          return isVersionedTransaction(transaction) ? web3_js.VersionedTransaction.deserialize(signedTransaction) : web3_js.Transaction.from(signedTransaction);
        });
      } catch (error) {
        throw new walletAdapterBase.WalletSignTransactionError(error == null ? void 0 : error.message, error);
      }
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }, _StandardWalletAdapter_signMessage = async function _StandardWalletAdapter_signMessage2(message) {
    try {
      const account = __classPrivateFieldGet$1(this, _StandardWalletAdapter_account, "f");
      if (!account)
        throw new walletAdapterBase.WalletNotConnectedError();
      if (!("solana:signMessage" in __classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f").features))
        throw new walletAdapterBase.WalletConfigError();
      if (!account.features.includes("solana:signMessage"))
        throw new walletAdapterBase.WalletSignMessageError();
      try {
        const signedMessages = await __classPrivateFieldGet$1(this, _StandardWalletAdapter_wallet, "f").features["solana:signMessage"].signMessage({
          account,
          message
        });
        return signedMessages[0].signature;
      } catch (error) {
        throw new walletAdapterBase.WalletSignMessageError(error == null ? void 0 : error.message, error);
      }
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  };
  var __classPrivateFieldSet = globalThis && globalThis.__classPrivateFieldSet || function(receiver, state, value, kind, f) {
    if (kind === "m")
      throw new TypeError("Private method is not writable");
    if (kind === "a" && !f)
      throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
      throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
  };
  var __classPrivateFieldGet = globalThis && globalThis.__classPrivateFieldGet || function(receiver, state, kind, f) {
    if (kind === "a" && !f)
      throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
      throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
  };
  var _AppReadyEvent_detail;
  let wallets = void 0;
  const registered = /* @__PURE__ */ new Set();
  const listeners = {};
  function getWallets() {
    if (wallets)
      return wallets;
    wallets = Object.freeze({ register, get, on });
    if (typeof window === "undefined")
      return wallets;
    const api = Object.freeze({ register });
    try {
      window.addEventListener("wallet-standard:register-wallet", ({ detail: callback }) => callback(api));
    } catch (error) {
      console.error("wallet-standard:register-wallet event listener could not be added\n", error);
    }
    try {
      window.dispatchEvent(new AppReadyEvent(api));
    } catch (error) {
      console.error("wallet-standard:app-ready event could not be dispatched\n", error);
    }
    return wallets;
  }
  function register(...wallets2) {
    var _a;
    wallets2 = wallets2.filter((wallet) => !registered.has(wallet));
    if (!wallets2.length)
      return () => {
      };
    wallets2.forEach((wallet) => registered.add(wallet));
    (_a = listeners["register"]) == null ? void 0 : _a.forEach((listener) => guard(() => listener(...wallets2)));
    return function unregister() {
      var _a2;
      wallets2.forEach((wallet) => registered.delete(wallet));
      (_a2 = listeners["unregister"]) == null ? void 0 : _a2.forEach((listener) => guard(() => listener(...wallets2)));
    };
  }
  function get() {
    return [...registered];
  }
  function on(event, listener) {
    var _a;
    ((_a = listeners[event]) == null ? void 0 : _a.push(listener)) || (listeners[event] = [listener]);
    return function off() {
      var _a2;
      listeners[event] = (_a2 = listeners[event]) == null ? void 0 : _a2.filter((existingListener) => listener !== existingListener);
    };
  }
  function guard(callback) {
    try {
      callback();
    } catch (error) {
      console.error(error);
    }
  }
  class AppReadyEvent extends Event {
    constructor(api) {
      super("wallet-standard:app-ready", {
        bubbles: false,
        cancelable: false,
        composed: false
      });
      _AppReadyEvent_detail.set(this, void 0);
      __classPrivateFieldSet(this, _AppReadyEvent_detail, api, "f");
    }
    get detail() {
      return __classPrivateFieldGet(this, _AppReadyEvent_detail, "f");
    }
    get type() {
      return "wallet-standard:app-ready";
    }
    preventDefault() {
      throw new Error("preventDefault cannot be called");
    }
    stopImmediatePropagation() {
      throw new Error("stopImmediatePropagation cannot be called");
    }
    stopPropagation() {
      throw new Error("stopPropagation cannot be called");
    }
  }
  _AppReadyEvent_detail = /* @__PURE__ */ new WeakMap();
  function DEPRECATED_getWallets() {
    if (wallets)
      return wallets;
    wallets = getWallets();
    if (typeof window === "undefined")
      return wallets;
    const callbacks = window.navigator.wallets || [];
    if (!Array.isArray(callbacks)) {
      console.error("window.navigator.wallets is not an array");
      return wallets;
    }
    const { register: register2 } = wallets;
    const push = (...callbacks2) => callbacks2.forEach((callback) => guard(() => callback({ register: register2 })));
    try {
      Object.defineProperty(window.navigator, "wallets", {
        value: Object.freeze({ push })
      });
    } catch (error) {
      console.error("window.navigator.wallets could not be set");
      return wallets;
    }
    push(...callbacks);
    return wallets;
  }
  function useStandardWalletAdapters(adapters) {
    const warnings = /* @__PURE__ */ new Set();
    const { get: get2, on: on2 } = DEPRECATED_getWallets();
    const swaAdapters = vue.shallowRef(
      wrapWalletsInAdapters(get2())
    );
    vue.watchEffect((onInvalidate) => {
      const listeners2 = [
        on2("register", (...wallets2) => {
          return swaAdapters.value = [
            ...swaAdapters.value,
            ...wrapWalletsInAdapters(wallets2)
          ];
        }),
        on2("unregister", (...wallets2) => {
          return swaAdapters.value = swaAdapters.value.filter(
            (swaAdapter) => wallets2.some((wallet) => wallet === swaAdapter.wallet)
          );
        })
      ];
      onInvalidate(() => listeners2.forEach((destroy) => destroy()));
    });
    return vue.computed(() => [
      ...swaAdapters.value,
      ...adapters.value.filter(({ name }) => {
        if (swaAdapters.value.some((swaAdapter) => swaAdapter.name === name)) {
          if (!warnings.has(name)) {
            warnings.add(name);
            console.warn(
              `${name} was registered as a Standard Wallet. The Wallet Adapter for ${name} can be removed from your app.`
            );
          }
          return false;
        }
        return true;
      })
    ]);
  }
  function wrapWalletsInAdapters(wallets2) {
    return wallets2.filter(isWalletAdapterCompatibleWallet).map((wallet) => new StandardWalletAdapter({ wallet }));
  }
  function useTransactionMethods(wallet, handleError) {
    const sendTransaction = async (transaction, connection, options) => {
      var _a;
      const adapter = (_a = wallet.value) == null ? void 0 : _a.adapter;
      if (!adapter)
        throw handleError(new WalletNotSelectedError());
      if (!adapter.connected)
        throw handleError(new walletAdapterBase.WalletNotConnectedError(), adapter);
      return await adapter.sendTransaction(transaction, connection, options);
    };
    const signTransaction = vue.computed(() => {
      var _a;
      const adapter = (_a = wallet.value) == null ? void 0 : _a.adapter;
      if (!(adapter && "signTransaction" in adapter))
        return;
      return async (transaction) => {
        if (!adapter.connected)
          throw handleError(new walletAdapterBase.WalletNotConnectedError());
        return await adapter.signTransaction(transaction);
      };
    });
    const signAllTransactions = vue.computed(() => {
      var _a;
      const adapter = (_a = wallet.value) == null ? void 0 : _a.adapter;
      if (!(adapter && "signAllTransactions" in adapter))
        return;
      return async (transactions) => {
        if (!adapter.connected)
          throw handleError(new walletAdapterBase.WalletNotConnectedError());
        return await adapter.signAllTransactions(transactions);
      };
    });
    const signMessage = vue.computed(() => {
      var _a;
      const adapter = (_a = wallet.value) == null ? void 0 : _a.adapter;
      if (!(adapter && "signMessage" in adapter))
        return;
      return async (message) => {
        if (!adapter.connected)
          throw handleError(new walletAdapterBase.WalletNotConnectedError());
        return await adapter.signMessage(message);
      };
    });
    return {
      sendTransaction,
      signTransaction,
      signAllTransactions,
      signMessage
    };
  }
  function useUnloadingWindow(isUsingMwaAdapterOnMobile) {
    const unloadingWindow = vue.ref(false);
    if (typeof window === "undefined") {
      return unloadingWindow;
    }
    vue.watchEffect((onInvalidate) => {
      if (isUsingMwaAdapterOnMobile.value) {
        return;
      }
      const handler = () => unloadingWindow.value = true;
      window.addEventListener("beforeunload", handler);
      onInvalidate(() => window.removeEventListener("beforeunload", handler));
    });
    return unloadingWindow;
  }
  function useWalletState(wallets2, name) {
    const wallet = vue.shallowRef(null);
    const publicKey = vue.ref(null);
    const connected = vue.ref(false);
    const readyState = vue.ref(walletAdapterBase.WalletReadyState.Unsupported);
    const ready = vue.computed(
      () => readyState.value === walletAdapterBase.WalletReadyState.Installed || readyState.value === walletAdapterBase.WalletReadyState.Loadable
    );
    const refreshWalletState = () => {
      var _a, _b, _c, _d, _e, _f;
      publicKey.value = (_b = (_a = wallet.value) == null ? void 0 : _a.adapter.publicKey) != null ? _b : null;
      connected.value = (_d = (_c = wallet.value) == null ? void 0 : _c.adapter.connected) != null ? _d : false;
      readyState.value = (_f = (_e = wallet.value) == null ? void 0 : _e.readyState) != null ? _f : walletAdapterBase.WalletReadyState.Unsupported;
    };
    vue.watchEffect(() => {
      var _a;
      wallet.value = name.value ? (_a = wallets2.value.find(({ adapter }) => adapter.name === name.value)) != null ? _a : null : null;
      refreshWalletState();
    });
    return {
      wallet,
      publicKey,
      connected,
      readyState,
      ready,
      refreshWalletState
    };
  }
  function useWrapAdaptersInWallets(adapters) {
    const wallets2 = vue.shallowRef([]);
    vue.watchEffect(() => {
      wallets2.value = adapters.value.map((newAdapter) => ({
        adapter: newAdapter,
        readyState: newAdapter.readyState
      }));
    });
    return wallets2;
  }
  const createWalletStore = ({
    wallets: initialAdapters = [],
    autoConnect: initialAutoConnect = false,
    cluster: initialCluster = "mainnet-beta",
    onError,
    localStorageKey = "walletName"
  }) => {
    const cluster = vue.ref(initialCluster);
    const connecting = vue.ref(false);
    const disconnecting = vue.ref(false);
    const rawAdapters = vue.shallowRef(initialAdapters);
    const rawAdaptersWithSwa = useStandardWalletAdapters(rawAdapters);
    const { isMobile, uriForAppIdentity } = useEnvironment(rawAdaptersWithSwa);
    const adapters = useMobileWalletAdapters(
      rawAdaptersWithSwa,
      isMobile,
      uriForAppIdentity,
      cluster
    );
    const wallets2 = useWrapAdaptersInWallets(adapters);
    const { name, isUsingMwaAdapterOnMobile, select, deselect } = useSelectWalletName(localStorageKey, isMobile);
    const {
      wallet,
      publicKey,
      connected,
      readyState,
      ready,
      refreshWalletState
    } = useWalletState(wallets2, name);
    const unloadingWindow = useUnloadingWindow(isUsingMwaAdapterOnMobile);
    const handleError = useErrorHandler(unloadingWindow, onError);
    useReadyStateListeners(wallets2);
    useAdapterListeners(
      wallet,
      unloadingWindow,
      isUsingMwaAdapterOnMobile,
      deselect,
      refreshWalletState,
      handleError
    );
    const autoConnect = useAutoConnect(
      initialAutoConnect,
      wallet,
      isUsingMwaAdapterOnMobile,
      connecting,
      connected,
      ready,
      deselect
    );
    const { sendTransaction, signTransaction, signAllTransactions, signMessage } = useTransactionMethods(wallet, handleError);
    const connect = async () => {
      if (connected.value || connecting.value || disconnecting.value)
        return;
      if (!wallet.value)
        throw handleError(new WalletNotSelectedError());
      const adapter = wallet.value.adapter;
      if (!ready.value)
        throw handleError(new walletAdapterBase.WalletNotReadyError(), adapter);
      try {
        connecting.value = true;
        await adapter.connect();
      } catch (error) {
        deselect();
        throw error;
      } finally {
        connecting.value = false;
      }
    };
    const disconnect = async () => {
      if (disconnecting.value || !wallet.value)
        return;
      try {
        disconnecting.value = true;
        await wallet.value.adapter.disconnect();
      } finally {
        disconnecting.value = false;
      }
    };
    return {
      wallets: wallets2,
      autoConnect,
      cluster,
      wallet,
      publicKey,
      readyState,
      ready,
      connected,
      connecting,
      disconnecting,
      select,
      connect,
      disconnect,
      sendTransaction,
      signTransaction,
      signAllTransactions,
      signMessage
    };
  };
  let walletStore = null;
  const useWallet = () => {
    if (walletStore)
      return walletStore;
    throw new WalletNotInitializedError(
      "Wallet not initialized. Please use the `initWallet` method to initialize the wallet."
    );
  };
  const initWallet = (walletStoreProps) => {
    walletStore = createWalletStore(walletStoreProps);
  };
  const _sfc_main$4 = vue.defineComponent({
    props: {
      wallet: Object
    },
    setup(props) {
      return vue.toRefs(props);
    }
  });
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _hoisted_1$4 = { class: "swv-button-icon" };
  const _hoisted_2$4 = ["src", "alt"];
  function _sfc_render$4(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("i", _hoisted_1$4, [
      _ctx.wallet ? (vue.openBlock(), vue.createElementBlock("img", {
        key: 0,
        src: _ctx.wallet.adapter.icon,
        alt: `${_ctx.wallet.adapter.name} icon`
      }, null, 8, _hoisted_2$4)) : vue.createCommentVNode("", true)
    ]);
  }
  const WalletIcon = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$4]]);
  const _sfc_main$3 = vue.defineComponent({
    components: {
      WalletIcon
    },
    props: {
      disabled: Boolean
    },
    setup(props, { emit }) {
      const { disabled } = vue.toRefs(props);
      const { wallet, connect, connecting, connected } = useWallet();
      const content = vue.computed(() => {
        if (connecting.value)
          return "Connecting ...";
        if (connected.value)
          return "Connected";
        if (wallet.value)
          return "Connect";
        return "Connect Wallet";
      });
      const onClick = (event) => {
        emit("click", event);
        if (event.defaultPrevented)
          return;
        connect().catch(() => {
        });
      };
      const scope = {
        wallet,
        disabled,
        connecting,
        connected,
        content,
        onClick
      };
      return {
        scope,
        ...scope
      };
    }
  });
  const _hoisted_1$3 = ["disabled"];
  const _hoisted_2$3 = ["textContent"];
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_wallet_icon = vue.resolveComponent("wallet-icon");
    return vue.renderSlot(_ctx.$slots, "default", vue.normalizeProps(vue.guardReactiveProps(_ctx.scope)), () => [
      vue.createElementVNode("button", {
        class: "swv-button swv-button-trigger",
        disabled: _ctx.disabled || !_ctx.wallet || _ctx.connecting || _ctx.connected,
        onClick: _cache[0] || (_cache[0] = (...args) => _ctx.onClick && _ctx.onClick(...args))
      }, [
        _ctx.wallet ? (vue.openBlock(), vue.createBlock(_component_wallet_icon, {
          key: 0,
          wallet: _ctx.wallet
        }, null, 8, ["wallet"])) : vue.createCommentVNode("", true),
        vue.createElementVNode("p", {
          textContent: vue.toDisplayString(_ctx.content)
        }, null, 8, _hoisted_2$3)
      ], 8, _hoisted_1$3)
    ]);
  }
  const WalletConnectButton = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$3]]);
  const _sfc_main$2 = vue.defineComponent({
    components: {
      WalletIcon
    },
    props: {
      disabled: Boolean
    },
    setup(props, { emit }) {
      const { disabled } = vue.toRefs(props);
      const { wallet, disconnect, disconnecting } = useWallet();
      const content = vue.computed(() => {
        if (disconnecting.value)
          return "Disconnecting ...";
        if (wallet.value)
          return "Disconnect";
        return "Disconnect Wallet";
      });
      const handleClick = (event) => {
        emit("click", event);
        if (event.defaultPrevented)
          return;
        disconnect().catch(() => {
        });
      };
      const scope = {
        wallet,
        disconnecting,
        disabled,
        content,
        handleClick
      };
      return {
        scope,
        ...scope
      };
    }
  });
  const _hoisted_1$2 = ["disabled"];
  const _hoisted_2$2 = ["textContent"];
  function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_wallet_icon = vue.resolveComponent("wallet-icon");
    return vue.renderSlot(_ctx.$slots, "default", vue.normalizeProps(vue.guardReactiveProps(_ctx.scope)), () => [
      vue.createElementVNode("button", {
        class: "swv-button swv-button-trigger",
        disabled: _ctx.disabled || _ctx.disconnecting || !_ctx.wallet,
        onClick: _cache[0] || (_cache[0] = (...args) => _ctx.handleClick && _ctx.handleClick(...args))
      }, [
        _ctx.wallet ? (vue.openBlock(), vue.createBlock(_component_wallet_icon, {
          key: 0,
          wallet: _ctx.wallet
        }, null, 8, ["wallet"])) : vue.createCommentVNode("", true),
        vue.createElementVNode("p", {
          textContent: vue.toDisplayString(_ctx.content)
        }, null, 8, _hoisted_2$2)
      ], 8, _hoisted_1$2)
    ]);
  }
  const WalletDisconnectButton = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$2]]);
  const _sfc_main$1 = vue.defineComponent({
    components: {
      WalletIcon
    },
    props: {
      featured: { type: Number, default: 3 },
      container: { type: String, default: "body" },
      logo: String,
      dark: Boolean
    },
    setup(props, { slots }) {
      const { featured, container, logo, dark } = vue.toRefs(props);
      const modalPanel = vue.ref(null);
      const modalOpened = vue.ref(false);
      const openModal = () => modalOpened.value = true;
      const closeModal = () => modalOpened.value = false;
      const hasLogo = vue.computed(() => !!slots.logo || !!logo.value);
      const { wallets: wallets2, select: selectWallet } = useWallet();
      const orderedWallets = vue.computed(() => {
        const installed = [];
        const notDetected = [];
        const loadable = [];
        wallets2.value.forEach((wallet) => {
          if (wallet.readyState === walletAdapterBase.WalletReadyState.NotDetected) {
            notDetected.push(wallet);
          } else if (wallet.readyState === walletAdapterBase.WalletReadyState.Loadable) {
            loadable.push(wallet);
          } else if (wallet.readyState === walletAdapterBase.WalletReadyState.Installed) {
            installed.push(wallet);
          }
        });
        return [...installed, ...loadable, ...notDetected];
      });
      const expandedWallets = vue.ref(false);
      const featuredWallets = vue.computed(
        () => orderedWallets.value.slice(0, featured.value)
      );
      const hiddenWallets = vue.computed(
        () => orderedWallets.value.slice(featured.value)
      );
      const walletsToDisplay = vue.computed(
        () => expandedWallets.value ? wallets2.value : featuredWallets.value
      );
      core.onClickOutside(modalPanel, closeModal);
      core.onKeyStroke("Escape", closeModal);
      core.onKeyStroke("Tab", (event) => {
        var _a, _b;
        const focusableElements = (_b = (_a = modalPanel.value) == null ? void 0 : _a.querySelectorAll("button")) != null ? _b : [];
        const firstElement = focusableElements == null ? void 0 : focusableElements[0];
        const lastElement = focusableElements == null ? void 0 : focusableElements[focusableElements.length - 1];
        if (event.shiftKey && document.activeElement === firstElement && lastElement) {
          lastElement.focus();
          event.preventDefault();
        } else if (!event.shiftKey && document.activeElement === lastElement && firstElement) {
          firstElement.focus();
          event.preventDefault();
        }
      });
      vue.watch(modalOpened, (isOpened) => {
        if (!isOpened)
          return;
        vue.nextTick(
          () => {
            var _a, _b, _c;
            return (_c = (_b = (_a = modalPanel.value) == null ? void 0 : _a.querySelectorAll("button")) == null ? void 0 : _b[0]) == null ? void 0 : _c.focus();
          }
        );
      });
      const scrollLock = core.useScrollLock(document.body);
      vue.watch(modalOpened, (isOpened) => scrollLock.value = isOpened);
      const scope = {
        dark,
        logo,
        hasLogo,
        featured,
        container,
        modalPanel,
        modalOpened,
        openModal,
        closeModal,
        expandedWallets,
        walletsToDisplay,
        featuredWallets,
        hiddenWallets,
        selectWallet
      };
      return {
        scope,
        ...scope
      };
    }
  });
  const _hoisted_1$1 = /* @__PURE__ */ vue.createElementVNode("div", { class: "swv-modal-overlay" }, null, -1);
  const _hoisted_2$1 = {
    class: "swv-modal-container",
    ref: "modalPanel"
  };
  const _hoisted_3$1 = {
    key: 0,
    class: "swv-modal-logo-wrapper"
  };
  const _hoisted_4$1 = ["src"];
  const _hoisted_5$1 = /* @__PURE__ */ vue.createElementVNode("h1", {
    class: "swv-modal-title",
    id: "swv-modal-title"
  }, "Connect Wallet", -1);
  const _hoisted_6 = /* @__PURE__ */ vue.createElementVNode("svg", {
    width: "14",
    height: "14"
  }, [
    /* @__PURE__ */ vue.createElementVNode("path", { d: "M14 12.461 8.3 6.772l5.234-5.233L12.006 0 6.772 5.234 1.54 0 0 1.539l5.234 5.233L0 12.006l1.539 1.528L6.772 8.3l5.69 5.7L14 12.461z" })
  ], -1);
  const _hoisted_7 = [
    _hoisted_6
  ];
  const _hoisted_8 = { class: "swv-modal-list" };
  const _hoisted_9 = ["onClick"];
  const _hoisted_10 = { class: "swv-button" };
  const _hoisted_11 = ["textContent"];
  const _hoisted_12 = {
    key: 0,
    class: "swv-wallet-status"
  };
  const _hoisted_13 = ["aria-expanded"];
  const _hoisted_14 = /* @__PURE__ */ vue.createElementVNode("i", { class: "swv-button-icon" }, [
    /* @__PURE__ */ vue.createElementVNode("svg", {
      width: "11",
      height: "6",
      xmlns: "http://www.w3.org/2000/svg"
    }, [
      /* @__PURE__ */ vue.createElementVNode("path", { d: "m5.938 5.73 4.28-4.126a.915.915 0 0 0 0-1.322 1 1 0 0 0-1.371 0L5.253 3.736 1.659.272a1 1 0 0 0-1.371 0A.93.93 0 0 0 0 .932c0 .246.1.48.288.662l4.28 4.125a.99.99 0 0 0 1.37.01z" })
    ])
  ], -1);
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_wallet_icon = vue.resolveComponent("wallet-icon");
    return vue.openBlock(), vue.createElementBlock(vue.Fragment, null, [
      vue.createElementVNode("div", {
        class: vue.normalizeClass(_ctx.dark ? "swv-dark" : "")
      }, [
        vue.renderSlot(_ctx.$slots, "default", vue.normalizeProps(vue.guardReactiveProps(_ctx.scope)))
      ], 2),
      _ctx.modalOpened ? (vue.openBlock(), vue.createBlock(vue.Teleport, {
        key: 0,
        to: _ctx.container
      }, [
        vue.createElementVNode("div", {
          "aria-labelledby": "swv-modal-title",
          "aria-modal": "true",
          class: vue.normalizeClass(["swv-modal", _ctx.dark ? "swv-dark" : ""]),
          role: "dialog"
        }, [
          vue.renderSlot(_ctx.$slots, "overlay", vue.normalizeProps(vue.guardReactiveProps(_ctx.scope)), () => [
            _hoisted_1$1
          ]),
          vue.createElementVNode("div", _hoisted_2$1, [
            vue.renderSlot(_ctx.$slots, "modal", vue.normalizeProps(vue.guardReactiveProps(_ctx.scope)), () => [
              vue.createElementVNode("div", {
                class: vue.normalizeClass(["swv-modal-wrapper", { "swv-modal-wrapper-no-logo": !_ctx.hasLogo }])
              }, [
                _ctx.hasLogo ? (vue.openBlock(), vue.createElementBlock("div", _hoisted_3$1, [
                  vue.renderSlot(_ctx.$slots, "logo", vue.normalizeProps(vue.guardReactiveProps(_ctx.scope)), () => [
                    vue.createElementVNode("img", {
                      alt: "logo",
                      class: "swv-modal-logo",
                      src: _ctx.logo
                    }, null, 8, _hoisted_4$1)
                  ])
                ])) : vue.createCommentVNode("", true),
                _hoisted_5$1,
                vue.createElementVNode("button", {
                  onClick: _cache[0] || (_cache[0] = vue.withModifiers((...args) => _ctx.closeModal && _ctx.closeModal(...args), ["prevent"])),
                  class: "swv-modal-button-close"
                }, _hoisted_7),
                vue.createElementVNode("ul", _hoisted_8, [
                  (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(_ctx.walletsToDisplay, (wallet) => {
                    return vue.openBlock(), vue.createElementBlock("li", {
                      key: wallet.adapter.name,
                      onClick: ($event) => {
                        _ctx.selectWallet(wallet.adapter.name);
                        _ctx.closeModal();
                      }
                    }, [
                      vue.createElementVNode("button", _hoisted_10, [
                        vue.createVNode(_component_wallet_icon, { wallet }, null, 8, ["wallet"]),
                        vue.createElementVNode("p", {
                          textContent: vue.toDisplayString(wallet.adapter.name)
                        }, null, 8, _hoisted_11),
                        wallet.readyState === "Installed" ? (vue.openBlock(), vue.createElementBlock("div", _hoisted_12, " Detected ")) : vue.createCommentVNode("", true)
                      ])
                    ], 8, _hoisted_9);
                  }), 128))
                ]),
                _ctx.hiddenWallets.length > 0 ? (vue.openBlock(), vue.createElementBlock("button", {
                  key: 1,
                  "aria-controls": "swv-modal-collapse",
                  "aria-expanded": _ctx.expandedWallets,
                  class: vue.normalizeClass(["swv-button swv-modal-collapse-button", { "swv-modal-collapse-button-active": _ctx.expandedWallets }]),
                  onClick: _cache[1] || (_cache[1] = ($event) => _ctx.expandedWallets = !_ctx.expandedWallets)
                }, [
                  vue.createTextVNode(vue.toDisplayString(_ctx.expandedWallets ? "Less" : "More") + " options ", 1),
                  _hoisted_14
                ], 10, _hoisted_13)) : vue.createCommentVNode("", true)
              ], 2)
            ])
          ], 512)
        ], 2)
      ], 8, ["to"])) : vue.createCommentVNode("", true)
    ], 64);
  }
  const WalletModalProvider = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render$1]]);
  const _sfc_main = vue.defineComponent({
    components: {
      WalletConnectButton,
      WalletIcon,
      WalletModalProvider
    },
    props: {
      featured: { type: Number, default: 3 },
      container: { type: String, default: "body" },
      logo: String,
      dark: Boolean
    },
    setup(props) {
      const { featured, container, logo, dark } = vue.toRefs(props);
      const { publicKey, wallet, disconnect } = useWallet();
      const dropdownPanel = vue.ref();
      const dropdownOpened = vue.ref(false);
      const openDropdown = () => {
        dropdownOpened.value = true;
      };
      const closeDropdown = () => {
        dropdownOpened.value = false;
      };
      core.onClickOutside(dropdownPanel, closeDropdown);
      const publicKeyBase58 = vue.computed(() => {
        var _a;
        return (_a = publicKey.value) == null ? void 0 : _a.toBase58();
      });
      const publicKeyTrimmed = vue.computed(() => {
        if (!wallet.value || !publicKeyBase58.value)
          return null;
        return publicKeyBase58.value.slice(0, 4) + ".." + publicKeyBase58.value.slice(-4);
      });
      const {
        copy,
        copied: addressCopied,
        isSupported: canCopy
      } = core.useClipboard();
      const copyAddress = () => publicKeyBase58.value && copy(publicKeyBase58.value);
      const scope = {
        featured,
        container,
        logo,
        dark,
        wallet,
        publicKey,
        publicKeyTrimmed,
        publicKeyBase58,
        canCopy,
        addressCopied,
        dropdownPanel,
        dropdownOpened,
        openDropdown,
        closeDropdown,
        copyAddress,
        disconnect
      };
      return {
        scope,
        ...scope
      };
    }
  });
  const _hoisted_1 = ["onClick"];
  const _hoisted_2 = {
    key: 2,
    class: "swv-dropdown"
  };
  const _hoisted_3 = ["aria-expanded", "title"];
  const _hoisted_4 = ["textContent"];
  const _hoisted_5 = ["onClick"];
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_wallet_connect_button = vue.resolveComponent("wallet-connect-button");
    const _component_wallet_icon = vue.resolveComponent("wallet-icon");
    const _component_wallet_modal_provider = vue.resolveComponent("wallet-modal-provider");
    return vue.openBlock(), vue.createBlock(_component_wallet_modal_provider, {
      featured: _ctx.featured,
      container: _ctx.container,
      logo: _ctx.logo,
      dark: _ctx.dark
    }, {
      default: vue.withCtx((modalScope) => [
        vue.renderSlot(_ctx.$slots, "default", vue.normalizeProps(vue.guardReactiveProps({ ...modalScope, ..._ctx.scope })), () => [
          !_ctx.wallet ? (vue.openBlock(), vue.createElementBlock("button", {
            key: 0,
            class: "swv-button swv-button-trigger",
            onClick: modalScope.openModal
          }, " Select Wallet ", 8, _hoisted_1)) : !_ctx.publicKeyBase58 ? (vue.openBlock(), vue.createBlock(_component_wallet_connect_button, { key: 1 })) : (vue.openBlock(), vue.createElementBlock("div", _hoisted_2, [
            vue.renderSlot(_ctx.$slots, "dropdown-button", vue.normalizeProps(vue.guardReactiveProps({ ...modalScope, ..._ctx.scope })), () => [
              vue.createElementVNode("button", {
                class: "swv-button swv-button-trigger",
                style: vue.normalizeStyle({ pointerEvents: _ctx.dropdownOpened ? "none" : "auto" }),
                "aria-expanded": _ctx.dropdownOpened,
                title: _ctx.publicKeyBase58,
                onClick: _cache[0] || (_cache[0] = (...args) => _ctx.openDropdown && _ctx.openDropdown(...args))
              }, [
                vue.createVNode(_component_wallet_icon, { wallet: _ctx.wallet }, null, 8, ["wallet"]),
                vue.createElementVNode("p", {
                  textContent: vue.toDisplayString(_ctx.publicKeyTrimmed)
                }, null, 8, _hoisted_4)
              ], 12, _hoisted_3)
            ]),
            vue.renderSlot(_ctx.$slots, "dropdown", vue.normalizeProps(vue.guardReactiveProps({ ...modalScope, ..._ctx.scope })), () => [
              vue.createElementVNode("ul", {
                "aria-label": "dropdown-list",
                class: vue.normalizeClass(["swv-dropdown-list", { "swv-dropdown-list-active": _ctx.dropdownOpened }]),
                ref: "dropdownPanel",
                role: "menu"
              }, [
                vue.renderSlot(_ctx.$slots, "dropdown-list", vue.normalizeProps(vue.guardReactiveProps({ ...modalScope, ..._ctx.scope })), () => [
                  _ctx.canCopy ? (vue.openBlock(), vue.createElementBlock("li", {
                    key: 0,
                    onClick: _cache[1] || (_cache[1] = (...args) => _ctx.copyAddress && _ctx.copyAddress(...args)),
                    class: "swv-dropdown-list-item",
                    role: "menuitem"
                  }, vue.toDisplayString(_ctx.addressCopied ? "Copied" : "Copy address"), 1)) : vue.createCommentVNode("", true),
                  vue.createElementVNode("li", {
                    onClick: ($event) => {
                      modalScope.openModal();
                      _ctx.closeDropdown();
                    },
                    class: "swv-dropdown-list-item",
                    role: "menuitem"
                  }, " Change wallet ", 8, _hoisted_5),
                  vue.createElementVNode("li", {
                    onClick: _cache[2] || (_cache[2] = ($event) => {
                      _ctx.disconnect();
                      _ctx.closeDropdown();
                    }),
                    class: "swv-dropdown-list-item",
                    role: "menuitem"
                  }, " Disconnect ")
                ])
              ], 2)
            ])
          ]))
        ])
      ]),
      overlay: vue.withCtx((modalScope) => [
        vue.renderSlot(_ctx.$slots, "modal-overlay", vue.normalizeProps(vue.guardReactiveProps({ ...modalScope, ..._ctx.scope })))
      ]),
      modal: vue.withCtx((modalScope) => [
        vue.renderSlot(_ctx.$slots, "modal", vue.normalizeProps(vue.guardReactiveProps({ ...modalScope, ..._ctx.scope })))
      ]),
      _: 3
    }, 8, ["featured", "container", "logo", "dark"]);
  }
  const WalletMultiButton = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
  function useAnchorWallet() {
    const walletStore2 = useWallet();
    return vue.computed(() => {
      if (!walletStore2)
        return;
      const { signTransaction, signAllTransactions, publicKey } = walletStore2;
      if (!publicKey.value || !signTransaction.value || !signAllTransactions.value)
        return;
      return {
        publicKey: publicKey.value,
        signTransaction: signTransaction.value,
        signAllTransactions: signAllTransactions.value
      };
    });
  }
  const index = {
    install: (app, options = {}) => {
      initWallet(options);
      app.config.globalProperties.$wallet = useWallet();
    }
  };
  exports2.WalletConnectButton = WalletConnectButton;
  exports2.WalletDisconnectButton = WalletDisconnectButton;
  exports2.WalletIcon = WalletIcon;
  exports2.WalletModalProvider = WalletModalProvider;
  exports2.WalletMultiButton = WalletMultiButton;
  exports2.WalletNotInitializedError = WalletNotInitializedError;
  exports2.WalletNotSelectedError = WalletNotSelectedError;
  exports2.createWalletStore = createWalletStore;
  exports2.default = index;
  exports2.initWallet = initWallet;
  exports2.useAnchorWallet = useAnchorWallet;
  exports2.useWallet = useWallet;
  Object.defineProperties(exports2, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
});
//# sourceMappingURL=solana-wallets-vue.umd.js.map
