export interface TimerController {
    set(callback: () => void, delayMs: number): unknown;
    clear(handle: unknown): void;
}

export const systemTimers: TimerController = {
    set: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
    clear: handle => globalThis.clearTimeout(handle as ReturnType<typeof globalThis.setTimeout>),
};
