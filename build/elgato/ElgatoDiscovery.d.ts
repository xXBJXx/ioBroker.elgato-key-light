import Bonjour, { type Service } from 'bonjour-service';
import { type TimerController } from '../timers';
import type { DiscoveredElgatoDevice } from './types';
export interface DiscoveryLogger {
    /**
     *
     */
    debug(message: string): void;
    /**
     *
     */
    silly(message: string): void;
    /**
     *
     */
    warn(message: string): void;
}
export interface ElgatoDiscoveryOptions {
    interface?: string;
    createBonjour?: (onError: (error: Error) => void, networkInterface?: string) => Bonjour;
    timers?: TimerController;
}
export declare class ElgatoDiscovery {
    private readonly logger?;
    private readonly options;
    private browser;
    private bonjour;
    private readonly timers;
    private waitTimer;
    private finishWait;
    private scanId;
    /**
     *
     */
    constructor(logger?: DiscoveryLogger | undefined, options?: ElgatoDiscoveryOptions);
    /**
     *
     */
    discover(timeoutMs?: number): Promise<DiscoveredElgatoDevice[]>;
    /**
     *
     */
    stop(): void;
    private wait;
}
export declare function serviceToDevice(service: Service): DiscoveredElgatoDevice;
export declare function discoveredDeviceIdentity(device: DiscoveredElgatoDevice): string;
export declare function preferredDiscoveredHost(device: DiscoveredElgatoDevice): string | undefined;
export declare function mergeDiscoveredDevice(current: DiscoveredElgatoDevice | undefined, next: DiscoveredElgatoDevice): DiscoveredElgatoDevice;
