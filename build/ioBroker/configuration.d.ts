import type { ConfiguredDevice } from '../device-manager/types';
export interface ConfigurationReconciliation {
    devices: ConfiguredDevice[];
    staleObjectIds: string[];
    migrated: boolean;
}
export declare function reconcileConfigurations(configured: ConfiguredDevice[] | undefined, objects: ioBroker.DeviceObject[], namespace: string): ConfigurationReconciliation;
export declare function normalizeConfiguration(config: ConfiguredDevice): ConfiguredDevice;
