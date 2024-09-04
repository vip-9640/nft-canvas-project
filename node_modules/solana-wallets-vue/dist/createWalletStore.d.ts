import type { WalletStore, WalletStoreProps } from "./types";
export declare const createWalletStore: ({ wallets: initialAdapters, autoConnect: initialAutoConnect, cluster: initialCluster, onError, localStorageKey, }: WalletStoreProps) => WalletStore;
