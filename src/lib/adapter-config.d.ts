import type { ConfiguredDevice } from '../device-manager/types';

declare global {
    namespace ioBroker {
        interface AdapterConfig {
            interval: number;
            discoveryEnabled?: boolean;
            requestTimeoutMs?: number;
            maxBackoffSeconds?: number;
            writeDebounceMs?: number;
            discoveryTimeoutMs?: number;
            discoveryInterface?: string;
            devices?: ConfiguredDevice[];
        }
    }
}

export {};
