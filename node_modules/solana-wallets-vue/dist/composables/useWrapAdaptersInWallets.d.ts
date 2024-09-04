import type { Wallet } from "@/types";
import type { Adapter } from "@solana/wallet-adapter-base";
import { Ref } from "vue";
/**
 * Dynamically turns an array of Adapters into an array of Wallets.
 */
export declare function useWrapAdaptersInWallets(adapters: Ref<Adapter[]>): Ref<Wallet[]>;
