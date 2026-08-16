import { ElgatoInvalidResponseError } from './errors';
import type { AccessoryInfo, BatteryInfo, LightSettings, LightsResponse, LightState, WifiInfo } from './types';

type UnknownRecord = Record<string, unknown>;

function record(value: unknown, context: string): UnknownRecord {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new ElgatoInvalidResponseError(`${context} must be a JSON object.`);
    }
    return value as UnknownRecord;
}

function requiredString(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new ElgatoInvalidResponseError(`${field} must be a non-empty string.`);
    }
    return value;
}

function optionalString(value: unknown): string | undefined {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
}

function optionalNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function optionalBooleanNumber(value: unknown): boolean | undefined {
    return value === 1 ? true : value === 0 ? false : undefined;
}

function compact<T extends object>(value: T): T {
    return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

export function parseAccessoryInfo(value: unknown): AccessoryInfo {
    const data = record(value, 'Accessory info');
    const features = Array.isArray(data.features)
        ? data.features.filter((feature): feature is string => typeof feature === 'string')
        : [];
    let wifiInfo: WifiInfo | undefined;
    if (data['wifi-info'] !== undefined) {
        const wifi = record(data['wifi-info'], 'wifi-info');
        wifiInfo = compact({
            ssid: optionalString(wifi.ssid),
            frequencyMHz: optionalNumber(wifi.frequencyMHz),
            rssi: optionalNumber(wifi.rssi),
        });
    }

    return compact({
        productName: requiredString(data.productName, 'productName'),
        serialNumber: requiredString(data.serialNumber, 'serialNumber'),
        displayName: optionalString(data.displayName) ?? '',
        hardwareBoardType: optionalNumber(data.hardwareBoardType),
        hardwareRevision: optionalString(data.hardwareRevision),
        macAddress: optionalString(data.macAddress),
        firmwareBuildNumber: optionalNumber(data.firmwareBuildNumber),
        firmwareVersion: optionalString(data.firmwareVersion),
        features,
        wifiInfo,
    });
}

function parseLight(value: unknown, index: number): LightState {
    const light = record(value, `lights[${index}]`);
    return compact({
        id: optionalNumber(light.id),
        name: optionalString(light.name),
        on: optionalNumber(light.on),
        brightness: optionalNumber(light.brightness),
        temperature: optionalNumber(light.temperature),
        hue: optionalNumber(light.hue),
        saturation: optionalNumber(light.saturation),
        numberOfSceneElements: optionalNumber(light.numberOfSceneElements),
        scene: Array.isArray(light.scene) ? light.scene : undefined,
    });
}

export function parseLights(value: unknown): LightsResponse {
    const data = record(value, 'Lights response');
    if (!Array.isArray(data.lights)) {
        throw new ElgatoInvalidResponseError('lights must be an array.');
    }
    return compact({
        numberOfLights: optionalNumber(data.numberOfLights),
        lights: data.lights.map(parseLight),
    });
}

export function parseSettings(value: unknown): LightSettings {
    const data = record(value, 'Light settings');
    let battery: LightSettings['battery'];
    if (data.battery !== undefined) {
        const batteryData = record(data.battery, 'settings.battery');
        let energySaving: NonNullable<LightSettings['battery']>['energySaving'];
        if (batteryData.energySaving !== undefined) {
            const energy = record(batteryData.energySaving, 'settings.battery.energySaving');
            let adjustBrightness: NonNullable<
                NonNullable<LightSettings['battery']>['energySaving']
            >['adjustBrightness'];
            if (energy.adjustBrightness !== undefined) {
                const adjust = record(energy.adjustBrightness, 'settings.battery.energySaving.adjustBrightness');
                adjustBrightness = compact({
                    enabled: optionalBooleanNumber(adjust.enable),
                    brightness: optionalNumber(adjust.brightness),
                });
            }
            energySaving = compact({
                enabled: optionalBooleanNumber(energy.enable),
                minimumBatteryLevel: optionalNumber(energy.minimumBatteryLevel),
                disableWifi: optionalBooleanNumber(energy.disableWifi),
                adjustBrightness,
            });
        }
        battery = compact({ bypass: optionalBooleanNumber(batteryData.bypass), energySaving });
    }

    return compact({
        powerOnBehavior: optionalNumber(data.powerOnBehavior),
        powerOnBrightness: optionalNumber(data.powerOnBrightness),
        powerOnTemperature: optionalNumber(data.powerOnTemperature),
        powerOnHue: optionalNumber(data.powerOnHue),
        powerOnSaturation: optionalNumber(data.powerOnSaturation),
        switchOnDurationMs: optionalNumber(data.switchOnDurationMs),
        switchOffDurationMs: optionalNumber(data.switchOffDurationMs),
        colorChangeDurationMs: optionalNumber(data.colorChangeDurationMs),
        battery,
    });
}

export function parseBattery(value: unknown): BatteryInfo {
    const data = record(value, 'Battery info');
    const rawPowerSource = optionalNumber(data.powerSource);
    const rawStatus = optionalNumber(data.status);
    const powerSource = rawPowerSource === 1 ? 'mains' : rawPowerSource === 2 ? 'battery' : 'unknown';
    const status =
        rawStatus === 0 ? 'discharging' : rawStatus === 1 ? 'charged' : rawStatus === 2 ? 'charging' : 'unknown';

    return compact({
        powerSource,
        status,
        rawPowerSource,
        rawStatus,
        level: optionalNumber(data.level),
        currentBatteryVoltageV: scaleMilli(data.currentBatteryVoltage),
        inputChargeVoltageV: scaleMilli(data.inputChargeVoltage),
        inputChargeCurrentA: scaleMilli(data.inputChargeCurrent),
    });
}

function scaleMilli(value: unknown): number | undefined {
    const numeric = optionalNumber(value);
    return numeric === undefined ? undefined : numeric / 1000;
}
