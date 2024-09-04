import type { Wallet } from "@/types";
import type { Adapter, WalletError } from "@solana/wallet-adapter-base";
import { Ref } from "vue";
/**
 * Handles the wallet adapter events.
 */
export declare function useAdapterListeners(wallet: Ref<Wallet | null>, unloadingWindow: Ref<boolean>, isUsingMwaAdapterOnMobile: Ref<boolean>, deselect: (force?: boolean) => void, refreshWalletState: () => void, handleError: (error: WalletError, adapter?: Adapter) => WalletError): void;
