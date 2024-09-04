import type { Adapter } from "@solana/wallet-adapter-base";
import type { Cluster } from "@solana/web3.js";
import { Ref } from "vue";
/**
 * Auto-discovers wallet adapters that follows the mobile wallet standard
 * and adds them to the list of registered adapters.
 */
export declare function useMobileWalletAdapters(adapters: Ref<Adapter[]>, isMobile: Ref<boolean>, uriForAppIdentity: string | null, cluster: Ref<Cluster>): Ref<Adapter[]>;
