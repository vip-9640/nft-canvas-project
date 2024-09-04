declare const _default: import("vue").DefineComponent<{
    disabled: BooleanConstructor;
}, {
    wallet: import("vue").Ref<import("../types").Wallet | null>;
    disabled: import("vue").Ref<boolean>;
    connecting: import("vue").Ref<boolean>;
    connected: import("vue").Ref<boolean>;
    content: import("vue").ComputedRef<"Connecting ..." | "Connected" | "Connect" | "Connect Wallet">;
    onClick: (event: MouseEvent) => void;
    scope: {
        wallet: import("vue").Ref<import("../types").Wallet | null>;
        disabled: import("vue").Ref<boolean>;
        connecting: import("vue").Ref<boolean>;
        connected: import("vue").Ref<boolean>;
        content: import("vue").ComputedRef<"Connecting ..." | "Connected" | "Connect" | "Connect Wallet">;
        onClick: (event: MouseEvent) => void;
    };
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
    disabled: BooleanConstructor;
}>>, {
    disabled: boolean;
}>;
export default _default;
