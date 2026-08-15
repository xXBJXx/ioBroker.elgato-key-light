"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileConfigurations = reconcileConfigurations;
exports.normalizeConfiguration = normalizeConfiguration;
function reconcileConfigurations(configured, objects, namespace) {
    const localObjects = objects.filter(object => object._id.startsWith(`${namespace}.`));
    if (configured !== undefined) {
        const devices = deduplicate(configured.map(config => normalizeConfiguration(config)));
        const configuredSerials = new Set(devices.flatMap(config => (config.serialNumber ? [config.serialNumber] : [])));
        const configuredTargets = new Set(devices.map(config => `${config.host}:${config.port}`));
        const staleObjectIds = localObjects.flatMap(object => {
            const legacy = configurationFromDeviceObject(object, namespace);
            const relativeId = object._id.slice(namespace.length + 1);
            const isConfigured = configuredSerials.has(relativeId) ||
                (legacy !== undefined &&
                    ((legacy.serialNumber !== undefined && configuredSerials.has(legacy.serialNumber)) ||
                        configuredTargets.has(`${legacy.host}:${legacy.port}`)));
            return isConfigured ? [] : [relativeId];
        });
        return { devices, staleObjectIds, migrated: false };
    }
    return {
        devices: deduplicate(localObjects.flatMap(object => {
            const config = configurationFromDeviceObject(object, namespace);
            return config ? [config] : [];
        })),
        staleObjectIds: [],
        migrated: true,
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
function configurationFromDeviceObject(object, namespace) {
    const native = object.native;
    const oldDevice = asOptionalRecord(native.device);
    const oldInfo = asOptionalRecord(oldDevice?.info);
    const host = oldDevice?.ip ?? native.ip ?? native.host;
    const port = oldDevice?.port ?? native.port ?? 9123;
    if (typeof host !== 'string' || typeof port !== 'number') {
        return undefined;
    }
    const relativeId = object._id.startsWith(`${namespace}.`) ? object._id.slice(namespace.length + 1) : '';
    const serialNumber = oldInfo?.serialNumber ?? native.serialNumber ?? relativeId;
    const displayName = oldInfo?.displayName ?? native.displayName;
    return {
        host,
        port,
        ...(typeof serialNumber === 'string' && serialNumber !== '' ? { serialNumber } : {}),
        ...(typeof displayName === 'string' ? { displayName } : {}),
        source: 'legacy',
        enabled: true,
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
function asOptionalRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value
        : undefined;
}
//# sourceMappingURL=configuration.js.map