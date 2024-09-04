import { Adapter, WalletError } from "@solana/wallet-adapter-base";
import { Ref } from "vue";
/**
 * Defines the logic that catches a given wallet error and handle it.
 */
export declare function useErrorHandler(unloadingWindow: Ref<boolean>, onError?: (error: WalletError, adapter?: Adapter) => void): (error: WalletError, adapter?: Adapter) => WalletError;
