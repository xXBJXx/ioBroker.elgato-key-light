import { hsvToRgb, miredToKelvin, rgbToHex } from '../elgato/conversions';
import type { ConfiguredDevice, DeviceHealth } from '../device-manager/types';
import type { ElgatoCapabilities, ElgatoSnapshot } from '../elgato/types';

export class StateRepository {
    private readonly ensuredObjects = new Set<string>();

    /**
     *
     */
    public constructor(private readonly adapter: ioBroker.Adapter) {}

    /**
     *
     */
    public async writeSnapshot(snapshot: ElgatoSnapshot, config: ConfiguredDevice): Promise<void> {
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
    public async writeHealth(health: DeviceHealth): Promise<void> {
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
    public async removeDevice(serialNumber: string): Promise<void> {
        const id = deviceId(serialNumber);
        await this.adapter.delObjectAsync(id, { recursive: true });
        for (const objectId of this.ensuredObjects) {
            if (objectId === id || objectId.startsWith(`${id}.`)) {
                this.ensuredObjects.delete(objectId);
            }
        }
    }

    private async ensureDevice(id: string, snapshot: ElgatoSnapshot, config: ConfiguredDevice): Promise<void> {
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

    private async ensureInfo(id: string, snapshot: ElgatoSnapshot): Promise<void> {
        await this.channel(`${id}.info`, 'Device information');
        const definitions: Record<string, ioBroker.StateCommon> = {
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

    private async ensureLightStates(id: string, capabilities: ElgatoCapabilities, count: number): Promise<void> {
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

    private async ensureBattery(id: string, capabilities: ElgatoCapabilities): Promise<void> {
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

    private async ensureSettings(id: string, capabilities: ElgatoCapabilities): Promise<void> {
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

    private async ensureHealth(id: string): Promise<void> {
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

    private async writeInfo(id: string, snapshot: ElgatoSnapshot): Promise<void> {
        const info = snapshot.info;
        const values: Record<string, ioBroker.StateValue> = {
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
        await this.adapter.setStateChangedAsync(
            `${id}.light.numberOfLights`,
            snapshot.lights.numberOfLights ?? snapshot.lights.lights.length,
            true,
        );
    }

    private async writeLight(
        id: string,
        index: number,
        light: ElgatoSnapshot['lights']['lights'][number],
    ): Promise<void> {
        const root = `${id}.light.lights.${index}`;
        if (light.on !== undefined) {
            await this.adapter.setStateChangedAsync(`${root}.on`, light.on === 1, true);
        }
        if (light.brightness !== undefined) {
            await this.adapter.setStateChangedAsync(`${root}.brightness`, light.brightness, true);
        }
        if (light.temperature !== undefined && light.temperature > 0) {
            await this.adapter.setStateChangedAsync(`${root}.temperature`, miredToKelvin(light.temperature), true);
        }
        if (light.hue !== undefined) {
            await this.adapter.setStateChangedAsync(`${root}.hue`, light.hue, true);
        }
        if (light.saturation !== undefined) {
            await this.adapter.setStateChangedAsync(`${root}.saturation`, light.saturation, true);
        }
        if (light.hue !== undefined && light.saturation !== undefined) {
            const rgb = hsvToRgb({ hue: light.hue, saturation: light.saturation, value: light.brightness ?? 100 });
            await this.adapter.setStateChangedAsync(`${root}.hex`, rgbToHex(rgb), true);
            await this.adapter.setStateChangedAsync(`${root}.rgb`, `${rgb.red},${rgb.green},${rgb.blue}`, true);
        }
    }

    private async writeBattery(id: string, snapshot: ElgatoSnapshot): Promise<void> {
        const battery = snapshot.battery!;
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

    private async writeSettings(id: string, snapshot: ElgatoSnapshot): Promise<void> {
        const settings = snapshot.settings!;
        const values = {
            powerOnBehavior: settings.powerOnBehavior,
            powerOnBrightness: settings.powerOnBrightness,
            powerOnTemperature: settings.powerOnTemperature ? miredToKelvin(settings.powerOnTemperature) : undefined,
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

    private async channel(id: string, name: string): Promise<void> {
        if (this.ensuredObjects.has(id)) {
            return;
        }
        await this.adapter.extendObjectAsync(id, { type: 'channel', common: { name }, native: {} });
        this.ensuredObjects.add(id);
    }

    private async state(id: string, common: ioBroker.StateCommon): Promise<void> {
        if (this.ensuredObjects.has(id)) {
            return;
        }
        await this.adapter.extendObjectAsync(id, { type: 'state', common, native: {} });
        this.ensuredObjects.add(id);
    }
}

function state(name: string, type: ioBroker.CommonType, role: string): ioBroker.StateCommon {
    return { name, type, role, read: true, write: false };
}

function writableState(name: string, type: ioBroker.CommonType, role: string): ioBroker.StateCommon {
    return { name, type, role, read: true, write: true };
}

function deviceId(serialNumber: string): string {
    return serialNumber.replace(/[^\dA-Za-z_-]/g, '_');
}
