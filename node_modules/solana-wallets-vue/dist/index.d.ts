import { App } from "vue";
import type { WalletStoreProps } from "./types";
export * from "./components";
export * from "./createWalletStore";
export * from "./errors";
export * from "./useAnchorWallet";
export * from "./useWallet";
declare const _default: {
    install: (app: App, options?: WalletStoreProps) => void;
};
export default _default;
