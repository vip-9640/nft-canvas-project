import type { Wallet, WalletStore } from "@/types";
import { Ref } from "vue";
/**
 * Updates the wallet's instance when its name changes and
 * derives other properties from the wallet's instance.
 */
export declare function useWalletState(wallets: Ref<Wallet[]>, name: Ref<string | null>): Pick<WalletStore, "wallet" | "publicKey" | "connected" | "readyState" | "ready"> & {
    refreshWalletState: () => void;
};
