import type { Wallet } from "@/types";
import { Ref } from "vue";
/**
 * Handles the auto-connect logic of the wallet.
 */
export declare function useAutoConnect(initialAutoConnect: boolean | Ref<boolean>, wallet: Ref<Wallet | null>, isUsingMwaAdapterOnMobile: Ref<boolean>, connecting: Ref<boolean>, connected: Ref<boolean>, ready: Ref<boolean>, deselect: () => void): Ref<boolean>;
