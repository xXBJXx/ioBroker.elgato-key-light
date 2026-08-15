import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ConfiguredDevice } from '../device-manager/types';
import { reconcileConfigurations } from './configuration';

function deviceObject(instance: number, serial: string, host: string): ioBroker.DeviceObject {
    return {
        _id: `elgato-key-light.${instance}.${serial}`,
        type: 'device',
        common: { name: serial },
        native: { host, port: 9123, serialNumber: serial },
    };
}

describe('configuration reconciliation', () => {
    it('keeps an existing devices array authoritative and removes only stale objects from its own instance', () => {
        const configured: ConfiguredDevice[] = [
            {
                host: '192.168.30.96',
                port: 9123,
                serialNumber: 'KEY_LIGHT',
                source: 'discovery',
                enabled: true,
            },
        ];
        const result = reconcileConfigurations(
            configured,
            [
                deviceObject(0, 'KEY_LIGHT', '192.168.30.96'),
                deviceObject(0, 'LIGHT_STRIP', '192.168.30.50'),
                deviceObject(1, 'SECOND_INSTANCE', '192.168.30.51'),
            ],
            'elgato-key-light.0',
        );

        assert.deepEqual(result.devices, configured);
        assert.deepEqual(result.staleObjectIds, ['LIGHT_STRIP']);
        assert.equal(result.migrated, false);
    });

    it('imports local legacy objects only when the devices property does not exist yet', () => {
        const result = reconcileConfigurations(
            undefined,
            [deviceObject(0, 'KEY_LIGHT', '192.168.30.96'), deviceObject(1, 'LIGHT_STRIP', '192.168.30.50')],
            'elgato-key-light.0',
        );

        assert.equal(result.migrated, true);
        assert.deepEqual(
            result.devices.map(device => device.serialNumber),
            ['KEY_LIGHT'],
        );
        assert.deepEqual(result.staleObjectIds, []);
    });

    it('migrates the nested device structure used by old adapter versions', () => {
        const legacy = {
            _id: 'elgato-key-light.0.LEGACY_SERIAL',
            type: 'device',
            common: { name: 'Legacy light' },
            native: {
                device: {
                    ip: '192.168.1.44',
                    port: 9123,
                    info: { serialNumber: 'LEGACY_SERIAL', displayName: 'Legacy light' },
                },
            },
        } as ioBroker.DeviceObject;
        const result = reconcileConfigurations(undefined, [legacy], 'elgato-key-light.0');
        assert.deepEqual(result.devices, [
            {
                host: '192.168.1.44',
                port: 9123,
                serialNumber: 'LEGACY_SERIAL',
                displayName: 'Legacy light',
                source: 'legacy',
                enabled: true,
            },
        ]);
    });
});
