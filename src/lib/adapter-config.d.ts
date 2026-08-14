import type { ConfiguredDevice } from '../device-manager/types';

declare global {
    namespace ioBroker {
        interface AdapterConfig {
            interval: number;
            discoveryEnabled?: boolean;
            autoAddDiscovered?: boolean;
            requestTimeoutMs?: number;
            maxBackoffSeconds?: number;
            writeDebounceMs?: number;
            discoveryTimeoutMs?: number;
            devices?: ConfiguredDevice[];
        }
    }
}

export {};
