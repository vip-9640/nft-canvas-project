"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  CANVAS_WALLET_NAME: () => CANVAS_WALLET_NAME,
  CanvasInterface: () => CanvasInterface2,
  registerCanvasWallet: () => registerCanvasWallet
});
module.exports = __toCommonJS(src_exports);
var CanvasInterface2 = __toESM(require("@dscvr-one/canvas-wallet-interface"), 1);

// src/register.ts
var import_core = require("@wallet-standard/core");
var import_wallet = require("@wallet-standard/wallet");

// src/wallet.ts
var bs58 = __toESM(require("bs58"), 1);
var import_wallet_standard = require("@solana/wallet-standard");
var import_web3 = require("@solana/web3.js");
var CanvasInterface = __toESM(require("@dscvr-one/canvas-wallet-interface"), 1);

// src/abstract-wallet.ts
var AbstractWallet = class {
  #listeners = {};
  _accounts;
  get version() {
    return "1.0.0";
  }
  get accounts() {
    return this._accounts.slice();
  }
  constructor() {
    this._accounts = [];
  }
  _on = (event, listener) => {
    this.#listeners[event]?.push(listener) || (this.#listeners[event] = [listener]);
    return () => this._off(event, listener);
  };
  _emit(event, ...args) {
    this.#listeners[event]?.forEach((listener) => listener.apply(null, args));
  }
  _off(event, listener) {
    this.#listeners[event] = this.#listeners[event]?.filter(
      (existingListener) => listener !== existingListener
    );
  }
};

// src/api/dscvr.ts
var validateHostMessage = async (message) => {
  return !!message;
};

// src/wallet.ts
var CANVAS_WALLET_NAME = "DSCVR Canvas";
var CanvasWallet = class _CanvasWallet extends AbstractWallet {
  #underlyingWalletName;
  #name = CANVAS_WALLET_NAME;
  #icon = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTA4IiBoZWlnaHQ9IjEwOCIgdmlld0JveD0iMCAwIDEwOCAxMDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0wIDE2QzAgNy4xNjM0NCA3LjE2MzQ0IDAgMTYgMEg5MkMxMDAuODM3IDAgMTA4IDcuMTYzNDQgMTA4IDE2VjkyQzEwOCAxMDAuODM3IDEwMC44MzcgMTA4IDkyIDEwOEgxNkM3LjE2MzQ0IDEwOCAwIDEwMC44MzcgMCA5MlYxNloiIGZpbGw9IiM0RjQ2RTUiLz4KPGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXAwXzEzMDgwXzE3NjQ1KSI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNODcuOTE2NyA1My45OTY2Qzg3LjkxNjcgNjMuMDIyIDg0LjM2MzIgNzEuNjAwNyA3Ny45ODA2IDc3Ljk4MjRDNzEuNjAzIDg0LjM2MjQgNjMuMDI1NCA4Ny45MTYzIDU0LjAwMTIgODcuOTE2M0M1MC4xNDQ4IDg3LjkxNjMgNDYuMzcwNSA4Ny4yNjg4IDQyLjgxMzcgODYuMDI4OUMzOC4wNDcyIDg0LjM2MjQgMzMuNjcyMyA4MS42MzY3IDMwLjAxODQgNzcuOTgyNEMyMy42MzU4IDcxLjYwMDcgMjAuMDg0IDYzLjAyMzcgMjAuMDg0IDUzLjk5NjZDMjAuMDg0IDUwLjA1NDUgMjAuNzY0OSA0Ni4xNTA5IDIyLjEwNjcgNDIuNDQ0N0MyMi40OTMxIDQxLjM4MjIgMjIuOTMxNSA0MC4zMzk4IDIzLjQyMTcgMzkuMzE5MUwyMy44NiAzOC40MDM4TDI0LjEyOTQgMzguNTE0M0MyNS4wMjYxIDM4Ljg4NDEgMjUuNDg0NSAzOS44NzQ2IDI1LjE4NjcgNDAuNzk5OUMyMC41MjA2IDU1LjI1MTYgMjUuNzk5IDcxLjMyMTMgMzkuNTg2NCA3OC40NTkzQzUwLjc0NTUgODQuMjMzNiA2NC43MDY4IDgyLjY5NTkgNzMuNzAxIDczLjcwMDZDNzUuNjQxNyA3MS43NTk2IDc3LjI2NDUgNjkuNTcxMSA3OC41Mzk0IDY3LjIwODVDNzguOTg0NCA2Ni4zODAyIDc5LjM4OTMgNjUuNTMwMiA3OS43NDczIDY0LjY2MzVDODEuMTMyNiA2MS4zMjA0IDgxLjg2MDMgNTcuNzA0NSA4MS44NjAzIDUzLjk5NjZDODEuODYwMyA0Ni41ODA5IDc4Ljk0MjYgMzkuNTM2NiA3My43MDEgMzQuMjkyN0M2OC40NTk0IDI5LjA1MDUgNjEuNDE0MyAyNi4xMzI0IDU0LjAwMTIgMjYuMTMyNEM1MS41NTE5IDI2LjEzMjQgNDkuMTE0MyAyNi40NDUzIDQ2Ljc3NTQgMjcuMDc0NEw0NS41MjkgMjcuNDQwOEM0MS43NjggMjkuMjAyOCAzOC41Njc1IDMyLjAwODggMzYuMzE5IDM1LjUwMjVDMzQuMDMzNiAzOS4wNTk3IDMyLjg0MDggNDMuMTY3NSAzMi44NDA4IDQ3LjM5NzRDMzIuODQwOCA0OC4xNzIxIDMyLjg3OTMgNDguOTQxOCAzMi45NTk2IDQ5LjcwMzFDMzMuNDcxNSA1NC42MTQxIDM1LjYwOCA1OS4yMDM3IDM5LjA5NzkgNjIuNzc5NEM0Ni4xODY1IDcwLjA0MTIgNjAuNzg4NiA3MC41NzUgNjUuODgzIDYwLjgzMThDNjguMjgyMSA1Ni4yMzM4IDY3Ljg0ODggNTAuNjkyIDY0Ljc0MiA0Ni41MzkxQzYxLjA2OCA0MS42MzE1IDU1LjIyMjUgNDAuNDY4NiA0OS42MzQ2IDQyLjI4NEg0OS42MzI5TDUwLjAwNiA2NS44MTNDNDcuMzc2IDY1LjI4MjYgNDQuMzI0NCA2NC4yMzY4IDQxLjgzMTYgNjEuNjQ2Nkw0MS41MjM4IDUyLjE4NzlMNDEuMDExOCAzNi41NjMzTDQxLjYxNzUgMzYuMjUwNEM1MS4zOTYzIDMxLjE4MDUgNjAuOTAyNCAzMC41NDY0IDY5LjE3MzggMzguODIwNUM3My4yMTA4IDQyLjg1OTYgNzUuNDU3NyA0OC4yODU5IDc1LjQ1NzcgNTMuOTk2NkM3NS40NTc3IDU5LjcwNzQgNzMuMjA5MSA2NS4xMzUzIDY5LjE3MzggNjkuMTcxMkM1OS4zMjE0IDc5LjAyODEgNDMuOTI0NiA3Ni4zNzYxIDM0Ljc2NDggNjYuOTk0M0MyOS42MzM2IDYxLjczODcgMjYuNzgyOCA1NC43NDYzIDI2Ljc4MjggNDcuMzk3NEMyNi43ODI4IDQ0LjQ4OTQgMjcuMjMxMSA0MS42MDE0IDI4LjEyNjIgMzguODAzN0MzMS40NzIyIDI5LjMwNDggMzguMjc4MSAyMi44NzYzIDQ3LjQ0MjkgMjAuODA2NUM0OS41MTI0IDIwLjMzOCA1MS43MDA4IDIwLjA5MzcgNTMuOTk2MSAyMC4wODM3QzU0LjM2NzYgMjAuMDgzNyA1NC43MzczIDIwLjA4MiA1NS4xMDU0IDIwLjA5MzdDNjMuNzM4MiAyMC4zNjgxIDcxLjg3NzQgMjMuOTA1MyA3Ny45ODA2IDMwLjAxMjZDODQuMzYzMiAzNi4zOTI2IDg3LjkxNjcgNDQuOTcxMyA4Ny45MTY3IDUzLjk5NjZaIiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXJfMTMwODBfMTc2NDUpIi8+CjwvZz4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhcl8xMzA4MF8xNzY0NSIgeDE9IjI0IiB5MT0iMzAuNSIgeDI9Ijc2IiB5Mj0iODQiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0JBRjNGMSIvPgo8c3RvcCBvZmZzZXQ9IjAuMjIxOTYzIiBzdG9wLWNvbG9yPSIjRTFFMkY5Ii8+CjxzdG9wIG9mZnNldD0iMC40MzExMjUiIHN0b3AtY29sb3I9IiNDMUYxRTkiLz4KPHN0b3Agb2Zmc2V0PSIwLjYzODk0IiBzdG9wLWNvbG9yPSIjREJDOEYwIi8+CjxzdG9wIG9mZnNldD0iMC44MDQ5ODUiIHN0b3AtY29sb3I9IiNBQUM3RUQiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjQzFDMEY1Ii8+CjwvbGluZWFyR3JhZGllbnQ+CjxjbGlwUGF0aCBpZD0iY2xpcDBfMTMwODBfMTc2NDUiPgo8cmVjdCB3aWR0aD0iNjgiIGhlaWdodD0iNjgiIGZpbGw9IndoaXRlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyMCAyMCkiLz4KPC9jbGlwUGF0aD4KPC9kZWZzPgo8L3N2Zz4K";
  get name() {
    return this.#name;
  }
  get icon() {
    return this.#icon;
  }
  get chains() {
    return import_wallet_standard.SOLANA_CHAINS.slice();
  }
  get features() {
    return {
      "standard:connect": {
        version: "1.0.0",
        connect: this.#connect
      },
      "standard:disconnect": {
        version: "1.0.0",
        disconnect: this.#disconnect
      },
      "standard:events": {
        version: "1.0.0",
        on: this._on
      },
      "solana:signAndSendTransaction": {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy"],
        signAndSendTransaction: this.#signAndSendTransaction
      },
      "solana:signTransaction": {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy"],
        signTransaction: this.#signTransaction
      },
      "solana:signMessage": {
        version: "1.0.0",
        signMessage: this.#signMessage
      }
    };
  }
  options;
  constructor(canvasClient) {
    super();
    this.options = { canvasClient };
    if (new.target === _CanvasWallet) {
      Object.freeze(this);
    }
  }
  setCanvasClient(canvasClient) {
    this.options.canvasClient = canvasClient;
  }
  #connect = async ({ silent } = {}) => {
    if (silent) return { accounts: this.accounts };
    const canvasResponse = await this.options.canvasClient.connectWallet(
      this.chains[0]
    );
    const isValidResponse = await validateHostMessage(canvasResponse);
    if (!isValidResponse) {
      throw new Error("invalid message");
    }
    if (!canvasResponse.untrusted.success) return { accounts: this.accounts };
    this.#underlyingWalletName = canvasResponse.untrusted.walletName;
    const account = {
      address: canvasResponse.untrusted.address,
      publicKey: new import_web3.PublicKey(canvasResponse.untrusted.address).toBytes(),
      chains: import_wallet_standard.SOLANA_CHAINS,
      features: [
        "solana:signAndSendTransaction",
        "solana:signTransaction",
        "solana:signMessage"
      ]
    };
    this._accounts.push(account);
    return { accounts: this.accounts };
  };
  #disconnect = async () => {
    if (!this.#underlyingWalletName) throw new Error("wallet not connected");
    const canvasResponse = await this.sendMessage(
      {
        type: "wallet:disconnect-request",
        payload: {
          name: this.#underlyingWalletName
        }
      },
      CanvasInterface.disconnectResponseSchema
    );
    if (!canvasResponse.untrusted.success) {
      throw new Error(canvasResponse.untrusted.error);
    }
    this._accounts.splice(0, this._accounts.length);
    this.#underlyingWalletName = void 0;
  };
  #signAndSendTransaction = async (...inputs) => {
    if (!this.#underlyingWalletName) throw new Error("wallet not connected");
    const outputs = [];
    for (const { transaction, account, chain, options } of inputs) {
      if (!account.features.includes("solana:signAndSendTransaction"))
        throw new Error("invalid feature");
      if (!this.chains.includes(chain))
        throw new Error("invalid chain");
      const rpcEndpoint = (0, import_wallet_standard.getEndpointForChain)(chain);
      const unsignedTx = bs58.encode(transaction);
      const canvasResponse = await this.sendMessage(
        {
          type: "wallet:send-transaction-request",
          payload: {
            name: this.#underlyingWalletName,
            rpcEndpoint,
            unsignedTx,
            chain,
            options
          }
        },
        CanvasInterface.sendTransactionResponseSchema
      );
      if (!canvasResponse.untrusted.success) {
        throw new Error(canvasResponse.untrusted.error);
      }
      outputs.push({
        signature: bs58.decode(canvasResponse.untrusted.signedTx)
      });
    }
    return outputs;
  };
  #signTransaction = async (...inputs) => {
    if (!this.#underlyingWalletName) throw new Error("wallet not connected");
    if (inputs.length === 0) return [];
    const transactions = [];
    for (const { transaction, account, chain } of inputs) {
      if (!account.features.includes("solana:signTransaction"))
        throw new Error("invalid feature");
      if (chain && !this.chains.includes(chain))
        throw new Error("invalid chain");
      const unsignedTx = bs58.encode(transaction);
      transactions.push({
        unsignedTx,
        chain
      });
    }
    const isSingleTransation = transactions.length === 1;
    const canvasResponse = isSingleTransation ? await this.sendMessage(
      {
        type: "wallet:sign-transaction-request",
        payload: {
          name: this.#underlyingWalletName,
          unsignedTx: transactions[0].unsignedTx,
          chain: transactions[0].chain
        }
      },
      CanvasInterface.signTransactionResponseSchema
    ) : await this.sendMessage(
      {
        type: "wallet:sign-all-transactions-request",
        payload: {
          name: this.#underlyingWalletName,
          unsignedTxs: transactions.map((t) => t.unsignedTx)
        }
      },
      CanvasInterface.signAllTransactionsResponseSchema
    );
    if (!canvasResponse.untrusted.success) {
      throw new Error(canvasResponse.untrusted.error);
    }
    const signedTxs = "signedTx" in canvasResponse.untrusted ? [canvasResponse.untrusted.signedTx] : canvasResponse.untrusted.signedTxs;
    const outputs = signedTxs.map(
      (signedTx) => ({ signedTransaction: bs58.decode(signedTx) })
    );
    return outputs;
  };
  #signMessage = async (...inputs) => {
    if (!this.#underlyingWalletName) throw new Error("wallet not connected");
    const outputs = [];
    for (const { account, message } of inputs) {
      if (!account.features.includes("solana:signMessage"))
        throw new Error("invalid feature");
      const canvasResponse = await this.sendMessage(
        {
          type: "wallet:sign-message-request",
          payload: {
            name: this.#underlyingWalletName,
            unsignedMessage: message
          }
        },
        CanvasInterface.signMessageResponseSchema
      );
      if (!canvasResponse.untrusted.success) {
        throw new Error(canvasResponse.untrusted.error);
      }
      outputs.push({
        signedMessage: message,
        signature: canvasResponse.untrusted.signedMessage
      });
    }
    return outputs;
  };
  async validateResponse(canvasResponse) {
    const isValidResponse = await validateHostMessage(canvasResponse);
    if (!isValidResponse) {
      throw new Error("invalid message");
    }
    const name = canvasResponse.untrusted.name;
    if (name !== this.#underlyingWalletName) {
      throw new Error("Unexpected wallet name");
    }
    return canvasResponse;
  }
  async sendMessage(message, schema) {
    const canvasResponse = await this.options.canvasClient.sendMessageAndWaitResponse(
      message,
      schema
    );
    return await this.validateResponse(canvasResponse);
  }
};

// src/register.ts
var registerCanvasWallet = (canvasClient) => {
  const { get } = (0, import_core.getWallets)();
  const wallets = get();
  const exists = wallets.find((wallet2) => wallet2.name === CANVAS_WALLET_NAME);
  if (exists) {
    exists.setCanvasClient(canvasClient);
    return exists;
  }
  const wallet = new CanvasWallet(canvasClient);
  (0, import_wallet.registerWallet)(wallet);
  return wallet;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CANVAS_WALLET_NAME,
  CanvasInterface,
  registerCanvasWallet
});
//# sourceMappingURL=index.cjs.map