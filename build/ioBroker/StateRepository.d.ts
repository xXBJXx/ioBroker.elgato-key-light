import type { ConfiguredDevice, DeviceHealth } from '../device-manager/types';
import type { ElgatoSnapshot } from '../elgato/types';
export declare class StateRepository {
    private readonly adapter;
    private readonly ensuredObjects;
    /**
     *
     */
    constructor(adapter: ioBroker.Adapter);
    /**
     *
     */
    writeSnapshot(snapshot: ElgatoSnapshot, config: ConfiguredDevice): Promise<void>;
    /**
     *
     */
    writeHealth(health: DeviceHealth): Promise<void>;
    /**
     *
     */
    removeDevice(serialNumber: string): Promise<void>;
    private ensureDevice;
    private ensureInfo;
    private ensureLightStates;
    private ensureBattery;
    private ensureSettings;
    private ensureHealth;
    private writeInfo;
    private writeLight;
    private writeBattery;
    private writeSettings;
    private channel;
    private state;
}
