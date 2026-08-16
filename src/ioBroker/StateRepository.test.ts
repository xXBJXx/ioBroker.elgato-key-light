import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ElgatoSnapshot } from '../elgato/types';
import { StateRepository } from './StateRepository';

function miniSnapshot(): ElgatoSnapshot {
    return {
        target: { host: '192.168.1.42', port: 9123 },
        info: {
            productName: 'Elgato Key Light Mini',
            serialNumber: 'MINI-1',
            displayName: 'Portable light',
            features: ['lights', 'battery'],
        },
        lights: { numberOfLights: 1, lights: [{ on: 1, brightness: 62, temperature: 200 }] },
        settings: { battery: { bypass: true } },
        battery: { level: 80.5, status: 'charging', powerSource: 'mains' },
        capabilities: {
            power: true,
            brightness: true,
            temperature: true,
            color: false,
            battery: true,
            studioMode: true,
            identify: true,
            settings: true,
            multipleLights: false,
            scenes: false,
        },
        capturedAt: new Date().toISOString(),
    };
}

describe('StateRepository', () => {
    it('creates writable Mini controls and acknowledges values from a snapshot', async () => {
        const objects = new Map<string, ioBroker.SettableObject>();
        const states = new Map<string, { value: ioBroker.StateValue; ack: boolean }>();
        const adapter = {
            namespace: 'elgato-key-light.0',
            extendObjectAsync: async (id: string, object: ioBroker.SettableObject) => void objects.set(id, object),
            setStateChangedAsync: async (id: string, value: ioBroker.StateValue, ack: boolean) =>
                void states.set(id, { value, ack }),
            delObjectAsync: async () => undefined,
        } as unknown as ioBroker.Adapter;
        const repository = new StateRepository(adapter);

        await repository.writeSnapshot(miniSnapshot(), {
            host: '192.168.1.42',
            port: 9123,
            source: 'manual',
            enabled: true,
        });
        await repository.writeHealth({
            id: 'MINI-1',
            target: { host: '192.168.1.42', port: 9123 },
            reachable: true,
            consecutiveFailures: 0,
            nextPollAt: '2026-08-15T12:00:00.000Z',
        });

        assert.equal(
            (objects.get('MINI-1.battery.studioMode')?.common as ioBroker.StateCommon | undefined)?.write,
            true,
        );
        assert.deepEqual(states.get('MINI-1.battery.studioMode'), { value: true, ack: true });
        assert.deepEqual(states.get('MINI-1.health.nextPoll'), {
            value: '2026-08-15T12:00:00.000Z',
            ack: true,
        });
    });

    it('deletes the complete serial root recursively', async () => {
        const deletions: Array<{ id: string; recursive: boolean | undefined }> = [];
        const adapter = {
            namespace: 'elgato-key-light.0',
            delObjectAsync: async (id: string, options?: { recursive?: boolean }) =>
                void deletions.push({ id, recursive: options?.recursive }),
        } as unknown as ioBroker.Adapter;
        await new StateRepository(adapter).removeDevice('MINI-1');
        assert.deepEqual(deletions, [{ id: 'MINI-1', recursive: true }]);
    });
});
