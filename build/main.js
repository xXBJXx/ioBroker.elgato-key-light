"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const utils = __importStar(require("@iobroker/adapter-core"));
const DeviceManager_1 = require("./device-manager/DeviceManager");
const ElgatoDiscovery_1 = require("./elgato/ElgatoDiscovery");
const conversions_1 = require("./elgato/conversions");
const errors_1 = require("./elgato/errors");
const StateRepository_1 = require("./ioBroker/StateRepository");
class ElgatoKeyLight extends utils.Adapter {
    manager;
    discovery;
    states;
    unloading = false;
    constructor(options = {}) {
        super({ ...options, name: 'elgato-key-light' });
        this.discovery = new ElgatoDiscovery_1.ElgatoDiscovery(this.log);
        this.states = new StateRepository_1.StateRepository(this);
        this.on('ready', () => void this.onReady());
        this.on('stateChange', (id, state) => void this.onStateChange(id, state));
        this.on('message', object => void this.onMessage(object));
        this.on('unload', callback => void this.onUnload(callback));
    }
    async onReady() {
        await this.setStateAsync('info.connection', false, true);
        await this.ensureServiceStates();
        this.subscribeStates('*');
        const configurations = await this.loadConfigurations();
        this.manager = new DeviceManager_1.DeviceManager({
            onSnapshot: (snapshot, config) => this.onSnapshot(snapshot, config),
            onHealth: health => this.onHealth(health),
            onConfigurationChanged: devices => this.persistConfigurations(devices),
        }, this.log, {
            pollIntervalMs: clamp(this.config.interval ?? 60, 5, 3_600) * 1_000,
            requestTimeoutMs: clamp(this.config.requestTimeoutMs ?? 3_000, 250, 30_000),
            maxBackoffMs: clamp(this.config.maxBackoffSeconds ?? 300, 5, 3_600) * 1_000,
            writeDebounceMs: clamp(this.config.writeDebounceMs ?? 200, 0, 2_000),
        });
        await this.manager.start(configurations);
        if ((this.config.discoveryEnabled ?? true) && this.config.autoAddDiscovered) {
            await this.autoDiscover().catch(error => this.logAdapterError('Automatic discovery failed', error));
        }
        await this.updateConnectionStates();
        this.log.info(`Started local Elgato manager with ${configurations.length} configured device(s).`);
    }
    async onSnapshot(snapshot, config) {
        if (this.unloading) {
            return;
        }
        await this.states.writeSnapshot(snapshot, config);
        await this.updateDeviceSummary();
    }
    async onHealth(health) {
        if (this.unloading) {
            return;
        }
        await this.states.writeHealth(health);
        await this.updateConnectionStates();
    }
    async onStateChange(id, state) {
        if (!state || state.ack || this.unloading || !this.manager) {
            return;
        }
        const relativeId = id.startsWith(`${this.namespace}.`) ? id.slice(this.namespace.length + 1) : id;
        const parts = relativeId.split('.');
        const serialNumber = parts[0];
        const property = parts.at(-1);
        if (!serialNumber || !property) {
            return;
        }
        try {
            if (property === 'identify') {
                if (state.val === true) {
                    await this.manager.identify(serialNumber);
                }
                await this.setStateAsync(relativeId, false, true);
                return;
            }
            if (property === 'displayName') {
                if (typeof state.val !== 'string') {
                    throw new TypeError('Display name must be a string.');
                }
                await this.manager.setDisplayName(serialNumber, state.val);
                return;
            }
            if (property === 'studioMode') {
                if (typeof state.val !== 'boolean') {
                    throw new TypeError('Studio mode must be boolean.');
                }
                await this.manager.setStudioMode(serialNumber, state.val);
                return;
            }
            const update = this.lightUpdate(property, state.val);
            if (update) {
                await this.manager.updateLight(serialNumber, update);
            }
        }
        catch (error) {
            this.logAdapterError(`State write ${relativeId} failed`, error);
            await this.manager.refresh(serialNumber).catch(() => undefined);
        }
    }
    lightUpdate(property, value) {
        switch (property) {
            case 'on':
                if (typeof value !== 'boolean') {
                    throw new TypeError('Power must be boolean.');
                }
                return { on: value ? 1 : 0 };
            case 'brightness':
                return { brightness: numberInRange(value, 0, 100, 'Brightness') };
            case 'temperature':
                return { temperature: (0, conversions_1.kelvinToMired)(numberInRange(value, 2_900, 7_000, 'Temperature')) };
            case 'hue':
                return { hue: numberInRange(value, 0, 360, 'Hue') };
            case 'saturation':
                return { saturation: numberInRange(value, 0, 100, 'Saturation') };
            case 'hex': {
                if (typeof value !== 'string') {
                    throw new TypeError('RGB hex color must be a string.');
                }
                const hsv = (0, conversions_1.rgbToHsv)((0, conversions_1.parseHex)(value));
                return { hue: hsv.hue, saturation: hsv.saturation, brightness: hsv.value };
            }
            case 'rgb': {
                if (typeof value !== 'string') {
                    throw new TypeError('RGB color must be a string.');
                }
                const hsv = (0, conversions_1.rgbToHsv)((0, conversions_1.parseRgb)(value));
                return { hue: hsv.hue, saturation: hsv.saturation, brightness: hsv.value };
            }
            default:
                return undefined;
        }
    }
    async onMessage(message) {
        if (!message.callback || !this.manager) {
            return;
        }
        try {
            const payload = asRecord(message.message);
            let result;
            switch (message.command) {
                case 'discover':
                    result = await this.discovery.discover(clamp(this.config.discoveryTimeoutMs ?? 5_000, 250, 60_000));
                    break;
                case 'testDevice':
                    result = await this.testDevice(payload);
                    break;
                case 'addDevice':
                case 'addKeyLight':
                    result = await this.addDevice(payload, message.command === 'addKeyLight');
                    break;
                case 'removeDevice':
                case 'deleteKeyLight':
                    result = await this.removeDevice(payload);
                    break;
                case 'refreshDevice':
                case 'reconnectDevice':
                    result = await this.manager.refresh(requiredString(payload.id, 'id'));
                    break;
                case 'identifyDevice':
                    await this.manager.identify(requiredString(payload.id, 'id'));
                    result = { success: true };
                    break;
                case 'getDevices':
                    result = this.manager.views().map(sanitizeDeviceView);
                    break;
                case 'getDiagnostics':
                    result = this.diagnostics();
                    break;
                default:
                    throw new Error(`Unknown command: ${message.command}`);
            }
            this.sendTo(message.from, message.command, { success: true, result, message: 'success' }, message.callback);
        }
        catch (error) {
            this.logAdapterError(`Message ${message.command} failed`, error);
            this.sendTo(message.from, message.command, {
                success: false,
                error: error instanceof errors_1.ElgatoError ? error.code : 'UNEXPECTED_ERROR',
                message: errorMessage(error),
            }, message.callback);
        }
    }
    async testDevice(payload) {
        const config = configFromPayload(payload, 'manual');
        const temporary = new DeviceManager_1.DeviceManager({ onSnapshot: () => undefined, onHealth: () => undefined, onConfigurationChanged: () => undefined }, this.log, {
            pollIntervalMs: 60_000,
            requestTimeoutMs: clamp(this.config.requestTimeoutMs ?? 3_000, 250, 30_000),
            maxBackoffMs: 60_000,
            writeDebounceMs: 0,
        });
        try {
            return sanitizeSnapshot(await temporary.add(config, false));
        }
        finally {
            temporary.stop();
        }
    }
    async autoDiscover() {
        const discovered = await this.discovery.discover(clamp(this.config.discoveryTimeoutMs ?? 5_000, 250, 60_000));
        await this.setStateChangedAsync('info.discovery', JSON.stringify({ devices: discovered, scannedAt: new Date().toISOString() }), true);
        const configuredTargets = new Set(this.manager.configurations().map(device => `${device.host}:${device.port}`));
        for (const service of discovered) {
            const host = service.addresses[0] ?? service.hostname;
            if (!host || configuredTargets.has(`${host}:${service.port}`)) {
                continue;
            }
            try {
                await this.manager.add({
                    host,
                    port: service.port,
                    displayName: service.name,
                    source: 'discovery',
                    enabled: true,
                });
                configuredTargets.add(`${host}:${service.port}`);
            }
            catch (error) {
                this.logAdapterError(`Could not add discovered service ${service.name}`, error);
            }
        }
    }
    async addDevice(payload, legacy) {
        const config = configFromPayload(payload, legacy ? 'legacy' : 'manual');
        const snapshot = await this.manager.add(config);
        await this.updateDeviceSummary();
        return legacy ? { error: false, message: 'success' } : sanitizeSnapshot(snapshot);
    }
    async removeDevice(payload) {
        const id = requiredString(payload.id, 'id');
        const removed = await this.manager.remove(id);
        if (removed) {
            await this.states.removeDevice(id);
        }
        await this.updateConnectionStates();
        await this.updateDeviceSummary();
        return { removed };
    }
    diagnostics() {
        return {
            adapter: { name: this.name, namespace: this.namespace, version: this.version },
            runtime: { node: process.version, platform: process.platform, architecture: process.arch },
            discovery: { enabled: this.config.discoveryEnabled ?? true, service: '_elg._tcp.local.' },
            devices: this.manager?.views().map(sanitizeDeviceView) ?? [],
            generatedAt: new Date().toISOString(),
        };
    }
    async loadConfigurations() {
        const configured = (this.config.devices ?? []).map(config => normalizeConfiguration(config));
        const legacyObjects = await this.getDevicesAsync();
        const legacy = [];
        for (const object of legacyObjects) {
            const native = object.native;
            const oldDevice = asOptionalRecord(native.device);
            const host = oldDevice?.ip ?? native.ip ?? native.host;
            const port = oldDevice?.port ?? native.port ?? 9123;
            if (typeof host !== 'string' || typeof port !== 'number') {
                continue;
            }
            const oldInfo = asOptionalRecord(oldDevice?.info);
            legacy.push({
                host,
                port,
                ...(typeof oldInfo?.serialNumber === 'string' ? { serialNumber: oldInfo.serialNumber } : {}),
                ...(typeof oldInfo?.displayName === 'string' ? { displayName: oldInfo.displayName } : {}),
                source: 'legacy',
                enabled: true,
            });
        }
        return deduplicate([...configured, ...legacy]);
    }
    async persistConfigurations(devices) {
        const id = `system.adapter.${this.namespace}`;
        const object = await this.getForeignObjectAsync(id);
        if (!object || object.type !== 'instance') {
            throw new Error(`Cannot load ${id} for configuration update.`);
        }
        object.native = { ...object.native, devices };
        await this.setForeignObjectAsync(id, object);
    }
    async ensureServiceStates() {
        await this.extendObjectAsync('info.connections', {
            type: 'state',
            common: {
                name: 'Configured connections (compatibility)',
                type: 'string',
                role: 'json',
                read: true,
                write: false,
                def: '[]',
            },
            native: {},
        });
        await this.extendObjectAsync('info.discovery', {
            type: 'state',
            common: { name: 'Discovery status', type: 'string', role: 'json', read: true, write: false, def: '{}' },
            native: {},
        });
    }
    async updateConnectionStates() {
        const views = this.manager?.views() ?? [];
        const connected = views.length > 0 && views.some(view => view.health.reachable);
        await this.setStateChangedAsync('info.connection', connected, true);
    }
    async updateDeviceSummary() {
        const summary = (this.manager?.views() ?? []).map(view => ({
            ip: view.config.host,
            port: view.config.port,
            name: view.snapshot?.info.displayName || view.config.displayName,
            info: view.snapshot
                ? {
                    productName: view.snapshot.info.productName,
                    serialNumber: view.snapshot.info.serialNumber,
                    displayName: view.snapshot.info.displayName,
                    firmwareVersion: view.snapshot.info.firmwareVersion,
                }
                : { serialNumber: view.config.serialNumber, displayName: view.config.displayName },
            capabilities: view.capabilities,
            reachable: view.health.reachable,
        }));
        await this.setStateChangedAsync('info.connections', JSON.stringify(summary), true);
    }
    logAdapterError(context, error) {
        const message = `${context}: ${errorMessage(error)}`;
        if (error instanceof errors_1.ElgatoError) {
            this.log.warn(message);
        }
        else {
            this.log.error(message);
        }
    }
    async onUnload(callback) {
        this.unloading = true;
        try {
            this.discovery.stop();
            const ids = this.manager?.views().map(view => view.health.id) ?? [];
            this.manager?.stop();
            await this.setStateAsync('info.connection', false, true);
            await Promise.all(ids.filter(id => !id.includes(':')).map(id => this.setStateAsync(`${id}.reachable`, false, true)));
        }
        catch (error) {
            this.log.warn(`Shutdown cleanup failed: ${errorMessage(error)}`);
        }
        finally {
            callback();
        }
    }
}
function configFromPayload(payload, source) {
    const host = payload.host ?? payload.ip;
    return {
        host: requiredString(host, 'host'),
        port: payload.port === undefined ? 9123 : numberInRange(payload.port, 1, 65_535, 'Port'),
        source,
        enabled: payload.enabled === undefined ? true : payload.enabled === true,
    };
}
function normalizeConfiguration(config) {
    return {
        ...config,
        port: config.port ?? 9123,
        source: config.source ?? 'manual',
        enabled: config.enabled !== false,
    };
}
function deduplicate(configurations) {
    const seen = new Set();
    return configurations.filter(config => {
        const key = config.serialNumber || `${config.host}:${config.port}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}
function asRecord(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return {};
    }
    return value;
}
function asOptionalRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value
        : undefined;
}
function requiredString(value, name) {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new TypeError(`${name} is required.`);
    }
    return value.trim();
}
function numberInRange(value, minimum, maximum, name) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
        throw new RangeError(`${name} must be between ${minimum} and ${maximum}.`);
    }
    return value;
}
function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function sanitizeSnapshot(snapshot) {
    return {
        ...snapshot,
        info: {
            ...snapshot.info,
            wifiInfo: snapshot.info.wifiInfo ? { ...snapshot.info.wifiInfo, ssid: undefined } : undefined,
        },
    };
}
function sanitizeDeviceView(view) {
    return { ...view, snapshot: view.snapshot ? sanitizeSnapshot(view.snapshot) : undefined };
}
if (require.main !== module) {
    module.exports = (options) => new ElgatoKeyLight(options);
}
else {
    new ElgatoKeyLight();
}
//# sourceMappingURL=main.js.map