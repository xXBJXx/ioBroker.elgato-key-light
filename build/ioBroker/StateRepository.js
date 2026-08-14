"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateRepository = void 0;
const conversions_1 = require("../elgato/conversions");
class StateRepository {
    adapter;
    ensuredObjects = new Set();
    /**
     *
     */
    constructor(adapter) {
        this.adapter = adapter;
    }
    /**
     *
     */
    async writeSnapshot(snapshot, config) {
        const id = deviceId(snapshot.info.serialNumber);
        await this.ensureDevice(id, snapshot, config);
        await this.ensureInfo(id, snapshot);
        await this.ensureLightStates(id, snapshot.capabilities, snapshot.lights.lights.length);
        await this.ensureHealth(id);
        if (snapshot.capabilities.battery) {
            await this.ensureBattery(id, snapshot.capabilities);
        }
        if (snapshot.settings) {
            await this.ensureSettings(id, snapshot.capabilities);
        }
        await this.writeInfo(id, snapshot);
        await Promise.all(snapshot.lights.lights.map((light, index) => this.writeLight(id, index, light)));
        if (snapshot.battery) {
            await this.writeBattery(id, snapshot);
        }
        if (snapshot.settings) {
            await this.writeSettings(id, snapshot);
        }
    }
    /**
     *
     */
    async writeHealth(health) {
        const id = deviceId(health.id);
        if (!health.id.includes(':')) {
            await this.ensureHealth(id);
        }
        if (health.id.includes(':')) {
            return;
        }
        await this.adapter.setStateChangedAsync(`${id}.health.reachable`, health.reachable, true);
        await this.adapter.setStateChangedAsync(`${id}.reachable`, health.reachable, true);
        await this.adapter.setStateChangedAsync(`${id}.health.consecutiveFailures`, health.consecutiveFailures, true);
        await this.adapter.setStateChangedAsync(`${id}.health.nextPoll`, health.nextPollAt, true);
        if (health.lastSuccess) {
            await this.adapter.setStateChangedAsync(`${id}.health.lastSuccess`, health.lastSuccess, true);
        }
        if (health.lastError !== undefined) {
            await this.adapter.setStateChangedAsync(`${id}.health.lastError`, health.lastError, true);
        }
        if (health.latencyMs !== undefined) {
            await this.adapter.setStateChangedAsync(`${id}.health.latency`, health.latencyMs, true);
        }
    }
    /**
     *
     */
    async removeDevice(serialNumber) {
        const id = deviceId(serialNumber);
        await this.adapter.delObjectAsync(id, { recursive: true });
        for (const objectId of this.ensuredObjects) {
            if (objectId === id || objectId.startsWith(`${id}.`)) {
                this.ensuredObjects.delete(objectId);
            }
        }
    }
    async ensureDevice(id, snapshot, config) {
        await this.adapter.extendObjectAsync(id, {
            type: 'device',
            common: {
                name: snapshot.info.displayName || snapshot.info.productName,
                statusStates: { onlineId: `${this.adapter.namespace}.${id}.reachable` },
            },
            native: {
                host: snapshot.target.host,
                ip: snapshot.target.host,
                port: snapshot.target.port,
                serialNumber: snapshot.info.serialNumber,
                source: config.source,
            },
        });
        await this.adapter.extendObjectAsync(`${id}.identify`, {
            type: 'state',
            common: { name: 'Identify device', type: 'boolean', role: 'button', read: false, write: true, def: false },
            native: {},
        });
        await this.adapter.extendObjectAsync(`${id}.reachable`, {
            type: 'state',
            common: {
                name: 'Device reachable',
                type: 'boolean',
                role: 'indicator.reachable',
                read: true,
                write: false,
                def: false,
            },
            native: {},
        });
    }
    async ensureInfo(id, snapshot) {
        await this.channel(`${id}.info`, 'Device information');
        const definitions = {
            ip: state('IP address', 'string', 'info.ip'),
            port: state('Port', 'number', 'info.port'),
            productName: state('Product name', 'string', 'info.name'),
            hardwareBoardType: state('Hardware board type', 'number', 'value'),
            hardwareRevision: state('Hardware revision', 'string', 'info.version'),
            macAddress: state('MAC address', 'string', 'info.mac'),
            firmwareBuildNumber: state('Firmware build number', 'number', 'value'),
            firmwareVersion: state('Firmware version', 'string', 'info.version'),
            serialNumber: state('Serial number', 'string', 'info.serial'),
            displayName: { ...state('Display name', 'string', 'info.name'), write: true },
            features: state('Advertised features', 'string', 'json'),
            capabilities: state('Detected capabilities', 'string', 'json'),
        };
        for (const [name, common] of Object.entries(definitions)) {
            await this.state(`${id}.info.${name}`, common);
        }
        if (snapshot.info.wifiInfo) {
            await this.channel(`${id}.info.wifi-info`, 'Wi-Fi information');
            await this.state(`${id}.info.wifi-info.ssid`, state('SSID', 'string', 'text'));
            await this.state(`${id}.info.wifi-info.frequencyMHz`, {
                ...state('Frequency', 'number', 'value.frequency'),
                unit: 'MHz',
            });
            await this.state(`${id}.info.wifi-info.rssi`, {
                ...state('Signal strength', 'number', 'value'),
                unit: 'dBm',
            });
        }
    }
    async ensureLightStates(id, capabilities, count) {
        await this.channel(`${id}.light`, 'Light');
        await this.state(`${id}.light.numberOfLights`, state('Number of lights', 'number', 'value'));
        await this.channel(`${id}.light.lights`, 'Light sources');
        for (let index = 0; index < Math.max(1, count); index++) {
            const root = `${id}.light.lights.${index}`;
            await this.channel(root, `Light ${index + 1}`);
            if (capabilities.power) {
                await this.state(`${root}.on`, writableState('Power', 'boolean', 'switch'));
            }
            if (capabilities.brightness) {
                await this.state(`${root}.brightness`, {
                    ...writableState('Brightness', 'number', 'level.dimmer'),
                    min: 0,
                    max: 100,
                    unit: '%',
                });
            }
            if (capabilities.temperature) {
                await this.state(`${root}.temperature`, {
                    ...writableState('Color temperature', 'number', 'level.color.temperature'),
                    min: 2_900,
                    max: 7_000,
                    unit: 'K',
                });
            }
            if (capabilities.color) {
                await this.state(`${root}.hue`, {
                    ...writableState('Hue', 'number', 'level.color.hue'),
                    min: 0,
                    max: 360,
                    unit: '°',
                });
                await this.state(`${root}.saturation`, {
                    ...writableState('Saturation', 'number', 'level.color.saturation'),
                    min: 0,
                    max: 100,
                    unit: '%',
                });
                await this.state(`${root}.hex`, writableState('RGB color', 'string', 'level.color.rgb'));
                await this.state(`${root}.rgb`, writableState('Legacy RGB color', 'string', 'level.color.rgb'));
            }
        }
    }
    async ensureBattery(id, capabilities) {
        await this.channel(`${id}.battery`, 'Battery');
        await this.state(`${id}.battery.level`, {
            ...state('Battery level', 'number', 'value.battery'),
            min: 0,
            max: 100,
            unit: '%',
        });
        await this.state(`${id}.battery.status`, state('Charging status', 'string', 'value'));
        await this.state(`${id}.battery.powerSource`, state('Power source', 'string', 'value'));
        await this.state(`${id}.battery.currentBatteryVoltage`, {
            ...state('Battery voltage', 'number', 'value.voltage'),
            unit: 'V',
        });
        await this.state(`${id}.battery.inputChargeVoltage`, {
            ...state('Input voltage', 'number', 'value.voltage'),
            unit: 'V',
        });
        await this.state(`${id}.battery.inputChargeCurrent`, {
            ...state('Input current', 'number', 'value.current'),
            unit: 'A',
        });
        if (capabilities.studioMode) {
            await this.state(`${id}.battery.studioMode`, writableState('Studio mode', 'boolean', 'switch'));
        }
    }
    async ensureSettings(id, capabilities) {
        await this.channel(`${id}.settings`, 'Device settings');
        await this.state(`${id}.settings.powerOnBehavior`, state('Power-on behavior', 'number', 'value'));
        await this.state(`${id}.settings.powerOnBrightness`, {
            ...state('Power-on brightness', 'number', 'level.dimmer'),
            unit: '%',
            min: 0,
            max: 100,
        });
        await this.state(`${id}.settings.powerOnTemperature`, {
            ...state('Power-on temperature', 'number', 'level.color.temperature'),
            unit: 'K',
        });
        await this.state(`${id}.settings.switchOnDurationMs`, {
            ...state('Switch-on duration', 'number', 'value.interval'),
            unit: 'ms',
        });
        await this.state(`${id}.settings.switchOffDurationMs`, {
            ...state('Switch-off duration', 'number', 'value.interval'),
            unit: 'ms',
        });
        await this.state(`${id}.settings.colorChangeDurationMs`, {
            ...state('Color-change duration', 'number', 'value.interval'),
            unit: 'ms',
        });
        if (capabilities.studioMode) {
            await this.channel(`${id}.settings.battery`, 'Legacy battery settings');
            await this.state(`${id}.settings.battery.bypass`, state('Battery bypass', 'boolean', 'switch'));
        }
    }
    async ensureHealth(id) {
        await this.channel(`${id}.health`, 'Device health');
        await this.state(`${id}.health.reachable`, state('Reachable', 'boolean', 'indicator.reachable'));
        await this.state(`${id}.health.lastSuccess`, state('Last successful contact', 'string', 'date'));
        await this.state(`${id}.health.lastError`, state('Last error', 'string', 'text'));
        await this.state(`${id}.health.latency`, { ...state('API latency', 'number', 'value.interval'), unit: 'ms' });
        await this.state(`${id}.health.consecutiveFailures`, {
            ...state('Consecutive failures', 'number', 'value'),
            min: 0,
        });
        await this.state(`${id}.health.nextPoll`, state('Next poll', 'string', 'date'));
    }
    async writeInfo(id, snapshot) {
        const info = snapshot.info;
        const values = {
            ip: snapshot.target.host,
            port: snapshot.target.port,
            productName: info.productName,
            serialNumber: info.serialNumber,
            displayName: info.displayName,
            features: JSON.stringify(info.features),
            capabilities: JSON.stringify(snapshot.capabilities),
        };
        for (const [key, value] of Object.entries({
            hardwareBoardType: info.hardwareBoardType,
            hardwareRevision: info.hardwareRevision,
            macAddress: info.macAddress,
            firmwareBuildNumber: info.firmwareBuildNumber,
            firmwareVersion: info.firmwareVersion,
        })) {
            if (value !== undefined) {
                values[key] = value;
            }
        }
        for (const [key, value] of Object.entries(values)) {
            await this.adapter.setStateChangedAsync(`${id}.info.${key}`, value, true);
        }
        if (info.wifiInfo) {
            for (const [key, value] of Object.entries(info.wifiInfo)) {
                if (value !== undefined) {
                    await this.adapter.setStateChangedAsync(`${id}.info.wifi-info.${key}`, value, true);
                }
            }
        }
        await this.adapter.setStateChangedAsync(`${id}.light.numberOfLights`, snapshot.lights.numberOfLights ?? snapshot.lights.lights.length, true);
    }
    async writeLight(id, index, light) {
        const root = `${id}.light.lights.${index}`;
        if (light.on !== undefined) {
            await this.adapter.setStateChangedAsync(`${root}.on`, light.on === 1, true);
        }
        if (light.brightness !== undefined) {
            await this.adapter.setStateChangedAsync(`${root}.brightness`, light.brightness, true);
        }
        if (light.temperature !== undefined && light.temperature > 0) {
            await this.adapter.setStateChangedAsync(`${root}.temperature`, (0, conversions_1.miredToKelvin)(light.temperature), true);
        }
        if (light.hue !== undefined) {
            await this.adapter.setStateChangedAsync(`${root}.hue`, light.hue, true);
        }
        if (light.saturation !== undefined) {
            await this.adapter.setStateChangedAsync(`${root}.saturation`, light.saturation, true);
        }
        if (light.hue !== undefined && light.saturation !== undefined) {
            const rgb = (0, conversions_1.hsvToRgb)({ hue: light.hue, saturation: light.saturation, value: light.brightness ?? 100 });
            await this.adapter.setStateChangedAsync(`${root}.hex`, (0, conversions_1.rgbToHex)(rgb), true);
            await this.adapter.setStateChangedAsync(`${root}.rgb`, `${rgb.red},${rgb.green},${rgb.blue}`, true);
        }
    }
    async writeBattery(id, snapshot) {
        const battery = snapshot.battery;
        const values = {
            level: battery.level,
            status: battery.status,
            powerSource: battery.powerSource,
            currentBatteryVoltage: battery.currentBatteryVoltageV,
            inputChargeVoltage: battery.inputChargeVoltageV,
            inputChargeCurrent: battery.inputChargeCurrentA,
            studioMode: snapshot.settings?.battery?.bypass,
        };
        for (const [key, value] of Object.entries(values)) {
            if (value !== undefined) {
                await this.adapter.setStateChangedAsync(`${id}.battery.${key}`, value, true);
            }
        }
    }
    async writeSettings(id, snapshot) {
        const settings = snapshot.settings;
        const values = {
            powerOnBehavior: settings.powerOnBehavior,
            powerOnBrightness: settings.powerOnBrightness,
            powerOnTemperature: settings.powerOnTemperature ? (0, conversions_1.miredToKelvin)(settings.powerOnTemperature) : undefined,
            switchOnDurationMs: settings.switchOnDurationMs,
            switchOffDurationMs: settings.switchOffDurationMs,
            colorChangeDurationMs: settings.colorChangeDurationMs,
        };
        for (const [key, value] of Object.entries(values)) {
            if (value !== undefined) {
                await this.adapter.setStateChangedAsync(`${id}.settings.${key}`, value, true);
            }
        }
        if (settings.battery?.bypass !== undefined) {
            await this.adapter.setStateChangedAsync(`${id}.settings.battery.bypass`, settings.battery.bypass, true);
        }
    }
    async channel(id, name) {
        if (this.ensuredObjects.has(id)) {
            return;
        }
        await this.adapter.extendObjectAsync(id, { type: 'channel', common: { name }, native: {} });
        this.ensuredObjects.add(id);
    }
    async state(id, common) {
        if (this.ensuredObjects.has(id)) {
            return;
        }
        await this.adapter.extendObjectAsync(id, { type: 'state', common, native: {} });
        this.ensuredObjects.add(id);
    }
}
exports.StateRepository = StateRepository;
function state(name, type, role) {
    return { name, type, role, read: true, write: false };
}
function writableState(name, type, role) {
    return { name, type, role, read: true, write: true };
}
function deviceId(serialNumber) {
    return serialNumber.replace(/[^\dA-Za-z_-]/g, '_');
}
//# sourceMappingURL=StateRepository.js.map