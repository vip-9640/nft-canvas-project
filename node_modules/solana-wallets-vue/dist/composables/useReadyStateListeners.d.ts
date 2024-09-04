import type { Wallet } from "@/types";
import { Ref } from "vue";
/**
 * Listens for `readyState` changes in all registered wallets.
 */
export declare function useReadyStateListeners(wallets: Ref<Wallet[]>): void;
