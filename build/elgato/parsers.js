"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAccessoryInfo = parseAccessoryInfo;
exports.parseLights = parseLights;
exports.parseSettings = parseSettings;
exports.parseBattery = parseBattery;
const errors_1 = require("./errors");
function record(value, context) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new errors_1.ElgatoInvalidResponseError(`${context} must be a JSON object.`);
    }
    return value;
}
function requiredString(value, field) {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new errors_1.ElgatoInvalidResponseError(`${field} must be a non-empty string.`);
    }
    return value;
}
function optionalString(value) {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
}
function optionalNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
function optionalBooleanNumber(value) {
    return value === 1 ? true : value === 0 ? false : undefined;
}
function compact(value) {
    return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}
function parseAccessoryInfo(value) {
    const data = record(value, 'Accessory info');
    const features = Array.isArray(data.features)
        ? data.features.filter((feature) => typeof feature === 'string')
        : [];
    let wifiInfo;
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
function parseLight(value, index) {
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
function parseLights(value) {
    const data = record(value, 'Lights response');
    if (!Array.isArray(data.lights)) {
        throw new errors_1.ElgatoInvalidResponseError('lights must be an array.');
    }
    return compact({
        numberOfLights: optionalNumber(data.numberOfLights),
        lights: data.lights.map(parseLight),
    });
}
function parseSettings(value) {
    const data = record(value, 'Light settings');
    let battery;
    if (data.battery !== undefined) {
        const batteryData = record(data.battery, 'settings.battery');
        let energySaving;
        if (batteryData.energySaving !== undefined) {
            const energy = record(batteryData.energySaving, 'settings.battery.energySaving');
            let adjustBrightness;
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
function parseBattery(value) {
    const data = record(value, 'Battery info');
    const rawPowerSource = optionalNumber(data.powerSource);
    const rawStatus = optionalNumber(data.status);
    const powerSource = rawPowerSource === 1 ? 'mains' : rawPowerSource === 2 ? 'battery' : 'unknown';
    const status = rawStatus === 0 ? 'discharging' : rawStatus === 1 ? 'charged' : rawStatus === 2 ? 'charging' : 'unknown';
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
function scaleMilli(value) {
    const numeric = optionalNumber(value);
    return numeric === undefined ? undefined : numeric / 1000;
}
//# sourceMappingURL=parsers.js.map