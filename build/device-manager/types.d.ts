import type { ElgatoCapabilities, ElgatoSnapshot, ElgatoTarget, LightUpdate } from '../elgato/types';
export interface ConfiguredDevice extends ElgatoTarget {
    serialNumber?: string;
    displayName?: string;
    source: 'manual' | 'discovery' | 'legacy';
    enabled: boolean;
}
export interface DeviceHealth {
    id: string;
    target: ElgatoTarget;
    reachable: boolean;
    lastSuccess?: string | undefined;
    lastError?: string | undefined;
    latencyMs?: number | undefined;
    consecutiveFailures: number;
    nextPollAt: string;
}
export interface ManagedDeviceView {
    config: ConfiguredDevice;
    health: DeviceHealth;
    snapshot?: ElgatoSnapshot;
    capabilities?: ElgatoCapabilities;
}
export interface DeviceManagerEvents {
    onSnapshot(snapshot: ElgatoSnapshot, config: ConfiguredDevice): Promise<void> | void;
    onHealth(health: DeviceHealth): Promise<void> | void;
    onConfigurationChanged(devices: ConfiguredDevice[]): Promise<void> | void;
}
export interface DeviceManagerOptions {
    pollIntervalMs: number;
    requestTimeoutMs: number;
    maxBackoffMs: number;
    writeDebounceMs: number;
    clientFactory?: (target: ElgatoTarget) => DeviceClient;
}
export interface DeviceClient {
    snapshot(): Promise<ElgatoSnapshot>;
    setLights(update: LightUpdate, lightIndex?: number): Promise<unknown>;
    setDisplayName(displayName: string): Promise<unknown>;
    setSettings(update: Record<string, unknown>): Promise<unknown>;
    identify(): Promise<void>;
}
