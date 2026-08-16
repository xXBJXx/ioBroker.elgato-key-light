export interface TimerController {
    set(callback: () => void, delayMs: number): unknown;
    clear(handle: unknown): void;
}
export declare const systemTimers: TimerController;
