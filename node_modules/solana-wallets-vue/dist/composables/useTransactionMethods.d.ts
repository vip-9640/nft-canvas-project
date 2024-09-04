/// <reference types="@solana/web3.js" />
import type { Wallet } from "@/types";
import type { Adapter, WalletError } from "@solana/wallet-adapter-base";
import { Ref } from "vue";
/**
 * Gets all the methods that can be used to interact with the wallet.
 * This includes sending transactions, signing transaction and signing messages.
 */
export declare function useTransactionMethods(wallet: Ref<Wallet | null>, handleError: (error: WalletError, adapter?: Adapter) => WalletError): {
    sendTransaction: (transaction: import("@solana/web3.js").Transaction | import("@solana/web3.js").VersionedTransaction, connection: import("@solana/web3.js").Connection, options?: import("@solana/wallet-adapter-base").SendTransactionOptions | undefined) => Promise<string>;
    signTransaction: import("vue").ComputedRef<(<T extends import("@solana/web3.js").Transaction | import("@solana/web3.js").VersionedTransaction>(transaction: T) => Promise<T>) | undefined>;
    signAllTransactions: import("vue").ComputedRef<(<T_1 extends import("@solana/web3.js").Transaction | import("@solana/web3.js").VersionedTransaction>(transactions: T_1[]) => Promise<T_1[]>) | undefined>;
    signMessage: import("vue").ComputedRef<((message: Uint8Array) => Promise<Uint8Array>) | undefined>;
};
