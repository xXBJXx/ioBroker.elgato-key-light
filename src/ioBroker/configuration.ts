import type { ConfiguredDevice } from '../device-manager/types';

export interface ConfigurationReconciliation {
    devices: ConfiguredDevice[];
    staleObjectIds: string[];
    migrated: boolean;
}

export function reconcileConfigurations(
    configured: ConfiguredDevice[] | undefined,
    objects: ioBroker.DeviceObject[],
    namespace: string,
): ConfigurationReconciliation {
    const localObjects = objects.filter(object => object._id.startsWith(`${namespace}.`));
    if (configured !== undefined) {
        const devices = deduplicate(configured.map(config => normalizeConfiguration(config)));
        const configuredSerials = new Set(
            devices.flatMap(config => (config.serialNumber ? [config.serialNumber] : [])),
        );
        const configuredTargets = new Set(devices.map(config => `${config.host}:${config.port}`));
        const staleObjectIds = localObjects.flatMap(object => {
            const legacy = configurationFromDeviceObject(object, namespace);
            const relativeId = object._id.slice(namespace.length + 1);
            const isConfigured =
                configuredSerials.has(relativeId) ||
                (legacy !== undefined &&
                    ((legacy.serialNumber !== undefined && configuredSerials.has(legacy.serialNumber)) ||
                        configuredTargets.has(`${legacy.host}:${legacy.port}`)));
            return isConfigured ? [] : [relativeId];
        });
        return { devices, staleObjectIds, migrated: false };
    }

    return {
        devices: deduplicate(
            localObjects.flatMap(object => {
                const config = configurationFromDeviceObject(object, namespace);
                return config ? [config] : [];
            }),
        ),
        staleObjectIds: [],
        migrated: true,
    };
}

export function normalizeConfiguration(config: ConfiguredDevice): ConfiguredDevice {
    return {
        ...config,
        port: config.port ?? 9123,
        source: config.source ?? 'manual',
        enabled: config.enabled !== false,
    };
}

function configurationFromDeviceObject(object: ioBroker.DeviceObject, namespace: string): ConfiguredDevice | undefined {
    const native = object.native as Record<string, unknown>;
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

function deduplicate(configurations: ConfiguredDevice[]): ConfiguredDevice[] {
    const seen = new Set<string>();
    return configurations.filter(config => {
        const key = config.serialNumber || `${config.host}:${config.port}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

function asOptionalRecord(value: unknown): Record<string, unknown> | undefined {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : undefined;
}
