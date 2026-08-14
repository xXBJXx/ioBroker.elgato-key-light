import type { AccessoryInfo, BatteryInfo, ElgatoSnapshot, ElgatoTarget, LightsResponse, LightSettings, LightUpdate } from './types';
export interface ElgatoLogger {
    /**
     *
     */
    debug(message: string): void;
    /**
     *
     */
    silly(message: string): void;
}
export interface ElgatoClientOptions {
    /**
     *
     */
    timeoutMs?: number;
    /**
     *
     */
    maxResponseBytes?: number;
    /**
     *
     */
    fetchImplementation?: typeof fetch;
    /**
     *
     */
    logger?: ElgatoLogger;
}
export declare class ElgatoClient {
    private readonly baseUrl;
    private readonly timeoutMs;
    private readonly maxResponseBytes;
    private readonly fetchImplementation;
    private readonly logger;
    readonly target: ElgatoTarget;
    /**
     *
     */
    constructor(host: string, port?: number, options?: ElgatoClientOptions);
    /**
     *
     */
    getAccessoryInfo(): Promise<AccessoryInfo>;
    /**
     *
     */
    setDisplayName(displayName: string): Promise<AccessoryInfo>;
    /**
     *
     */
    getLights(): Promise<LightsResponse>;
    /**
     *
     */
    setLights(update: LightUpdate, lightIndex?: number): Promise<LightsResponse>;
    /**
     *
     */
    getSettings(): Promise<LightSettings>;
    /**
     *
     */
    setSettings(update: Record<string, unknown>): Promise<LightSettings>;
    /**
     *
     */
    getBattery(): Promise<BatteryInfo>;
    /**
     *
     */
    identify(): Promise<void>;
    /**
     *
     */
    snapshot(): Promise<ElgatoSnapshot>;
    private request;
}
