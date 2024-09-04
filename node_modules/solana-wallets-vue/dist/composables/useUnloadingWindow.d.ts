import { Ref } from "vue";
/**
 * Provides a boolean that tells us if the window is unloading.
 * This is only relevant in the browser.
 */
export declare function useUnloadingWindow(isUsingMwaAdapterOnMobile: Ref<boolean>): Ref<boolean>;
