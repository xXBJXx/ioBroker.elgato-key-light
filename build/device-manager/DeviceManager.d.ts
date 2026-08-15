import { type ElgatoLogger } from '../elgato/ElgatoClient';
import type { ElgatoSnapshot, LightUpdate } from '../elgato/types';
import type { ConfiguredDevice, DeviceManagerEvents, DeviceManagerOptions, ManagedDeviceView } from './types';
export interface DeviceManagerLogger extends ElgatoLogger {
    /**
     *
     */
    warn(message: string): void;
}
export declare class DeviceManager {
    private readonly events;
    private readonly logger;
    private readonly options;
    private readonly devices;
    private timer;
    private stopped;
    /**
     *
     */
    constructor(events: DeviceManagerEvents, logger: DeviceManagerLogger, options: DeviceManagerOptions);
    /**
     *
     */
    start(configurations: ConfiguredDevice[]): Promise<void>;
    /**
     *
     */
    stop(): void;
    /**
     *
     */
    add(configuration: ConfiguredDevice, notify?: boolean): Promise<ElgatoSnapshot>;
    private replaceDiscoveredTarget;
    /**
     *
     */
    remove(id: string): Promise<boolean>;
    /**
     *
     */
    refresh(id: string): Promise<ElgatoSnapshot>;
    /**
     *
     */
    updateLight(id: string, update: LightUpdate): Promise<ElgatoSnapshot>;
    /**
     *
     */
    identify(id: string): Promise<void>;
    /**
     *
     */
    setDisplayName(id: string, displayName: string): Promise<ElgatoSnapshot>;
    /**
     *
     */
    setStudioMode(id: string, enabled: boolean): Promise<ElgatoSnapshot>;
    /**
     *
     */
    views(): ManagedDeviceView[];
    /**
     *
     */
    configurations(): ConfiguredDevice[];
    private createWriteTimer;
    private serialized;
    private requireDevice;
    private schedule;
    private pollDue;
}
