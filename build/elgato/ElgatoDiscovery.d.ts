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
export declare class ElgatoDiscovery {
    private readonly logger?;
    private browser;
    private bonjour;
    /**
     *
     */
    constructor(logger?: DiscoveryLogger | undefined);
    /**
     *
     */
    discover(timeoutMs?: number): Promise<DiscoveredElgatoDevice[]>;
    /**
     *
     */
    stop(): void;
}
