import type { Adapter } from "@solana/wallet-adapter-base";
import { Ref } from "vue";
export declare enum Environment {
    DESKTOP_WEB = 0,
    MOBILE_WEB = 1
}
export declare function useEnvironment(adapters: Ref<Adapter[]>): {
    userAgent: string | null;
    uriForAppIdentity: string | null;
    environment: Ref<Environment>;
    isMobile: Ref<boolean>;
};
