import type { WalletName } from "@solana/wallet-adapter-base";
import { Ref } from "vue";
/**
 * Selects a wallet from its name and stores it in local storage.
 */
export declare function useSelectWalletName(localStorageKey: string, isMobile: Ref<boolean>): {
    name: Ref<string | null>;
    isUsingMwaAdapter: Ref<boolean>;
    isUsingMwaAdapterOnMobile: Ref<boolean>;
    select: (name: WalletName) => void;
    deselect: (force?: boolean) => void;
};
