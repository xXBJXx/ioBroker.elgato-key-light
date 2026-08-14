export interface ElgatoTarget {
    host: string;
    port: number;
}

export interface WifiInfo {
    ssid?: string | undefined;
    frequencyMHz?: number | undefined;
    rssi?: number | undefined;
}

export interface AccessoryInfo {
    productName: string;
    serialNumber: string;
    displayName: string;
    hardwareBoardType?: number | undefined;
    hardwareRevision?: string | undefined;
    macAddress?: string | undefined;
    firmwareBuildNumber?: number | undefined;
    firmwareVersion?: string | undefined;
    features: string[];
    wifiInfo?: WifiInfo | undefined;
}

export interface LightState {
    id?: number | undefined;
    name?: string | undefined;
    on?: number | undefined;
    brightness?: number | undefined;
    temperature?: number | undefined;
    hue?: number | undefined;
    saturation?: number | undefined;
    numberOfSceneElements?: number | undefined;
    scene?: unknown[] | undefined;
}

export interface LightsResponse {
    numberOfLights?: number | undefined;
    lights: LightState[];
}

export interface LightUpdate {
    id?: number;
    on?: number;
    brightness?: number;
    temperature?: number;
    hue?: number;
    saturation?: number;
}

export interface BatteryEnergySaving {
    enabled?: boolean;
    minimumBatteryLevel?: number;
    disableWifi?: boolean;
    adjustBrightness?: {
        enabled?: boolean | undefined;
        brightness?: number | undefined;
    };
}

export interface BatterySettings {
    bypass?: boolean | undefined;
    energySaving?: BatteryEnergySaving | undefined;
}

export interface LightSettings {
    powerOnBehavior?: number | undefined;
    powerOnBrightness?: number | undefined;
    powerOnTemperature?: number | undefined;
    powerOnHue?: number | undefined;
    powerOnSaturation?: number | undefined;
    switchOnDurationMs?: number | undefined;
    switchOffDurationMs?: number | undefined;
    colorChangeDurationMs?: number | undefined;
    battery?: BatterySettings | undefined;
}

export type BatteryPowerSource = 'unknown' | 'mains' | 'battery';
export type BatteryChargeStatus = 'unknown' | 'discharging' | 'charging' | 'charged';

export interface BatteryInfo {
    powerSource: BatteryPowerSource;
    status: BatteryChargeStatus;
    rawPowerSource?: number | undefined;
    rawStatus?: number | undefined;
    level?: number | undefined;
    currentBatteryVoltageV?: number | undefined;
    inputChargeVoltageV?: number | undefined;
    inputChargeCurrentA?: number | undefined;
}

export interface ElgatoCapabilities {
    power: boolean;
    brightness: boolean;
    temperature: boolean;
    color: boolean;
    battery: boolean;
    studioMode: boolean;
    identify: boolean;
    settings: boolean;
    multipleLights: boolean;
    scenes: boolean;
}

export interface ElgatoSnapshot {
    target: ElgatoTarget;
    info: AccessoryInfo;
    lights: LightsResponse;
    settings?: LightSettings;
    battery?: BatteryInfo;
    capabilities: ElgatoCapabilities;
    capturedAt: string;
}

export interface DiscoveredElgatoDevice {
    name: string;
    hostname?: string;
    addresses: string[];
    port: number;
    serviceType: '_elg._tcp.local.';
    txt: Record<string, string>;
}
