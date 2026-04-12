export interface ToggleSignalRef {
    update(updater: (current: boolean) => boolean): void;
}
