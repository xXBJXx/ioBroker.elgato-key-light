import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ElgatoClient } from './ElgatoClient';
import { ElgatoApiError, ElgatoInvalidResponseError } from './errors';

function jsonResponse(value: unknown, status = 200): Response {
    return new Response(JSON.stringify(value), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

describe('ElgatoClient', () => {
    it('collects a capability-driven Key Light Mini snapshot', async () => {
        const requests: Array<{ url: string; method: string }> = [];
        const fetchImplementation: typeof fetch = async (input, init) => {
            const url = String(input);
            requests.push({ url, method: init?.method ?? 'GET' });
            if (url.endsWith('/accessory-info')) {
                return jsonResponse({
                    productName: 'Elgato Key Light Mini',
                    serialNumber: 'MINI-1',
                    displayName: 'Mini',
                    hardwareRevision: '1.0',
                    features: ['lights'],
                });
            }
            if (url.endsWith('/lights/settings')) {
                return jsonResponse({ battery: { bypass: 0 }, powerOnTemperature: 230 });
            }
            if (url.endsWith('/battery-info')) {
                return jsonResponse({ powerSource: 2, status: 0, level: 95.36 });
            }
            return jsonResponse({ numberOfLights: 1, lights: [{ on: 1, brightness: 20, temperature: 230 }] });
        };

        const client = new ElgatoClient('192.168.1.15', 9123, { fetchImplementation });
        const snapshot = await client.snapshot();

        assert.equal(snapshot.info.serialNumber, 'MINI-1');
        assert.equal(snapshot.capabilities.battery, true);
        assert.equal(snapshot.capabilities.studioMode, true);
        assert.equal(snapshot.capabilities.temperature, true);
        assert.equal(snapshot.battery?.powerSource, 'battery');
        assert.equal(requests.length, 4);
    });

    it('maps non-success HTTP responses to typed API errors', async () => {
        const client = new ElgatoClient('192.168.1.15', 9123, {
            fetchImplementation: async () => jsonResponse({ errors: ['nope'] }, 500),
        });
        await assert.rejects(client.getLights(), ElgatoApiError);
    });

    it('rejects invalid and oversized responses', async () => {
        const invalid = new ElgatoClient('192.168.1.15', 9123, {
            fetchImplementation: async () => new Response('{invalid', { status: 200 }),
        });
        await assert.rejects(invalid.getLights(), ElgatoInvalidResponseError);

        const oversized = new ElgatoClient('192.168.1.15', 9123, {
            maxResponseBytes: 8,
            fetchImplementation: async () => jsonResponse({ lights: [] }),
        });
        await assert.rejects(oversized.getLights(), ElgatoInvalidResponseError);
    });

    it('sends only writable API fields without a response-only light id', async () => {
        let capturedBody = '';
        const client = new ElgatoClient('192.168.1.15', 9123, {
            fetchImplementation: async (_input, init) => {
                capturedBody = String(init?.body);
                return jsonResponse({ numberOfLights: 1, lights: [{ id: 0, brightness: 42 }] });
            },
        });
        await client.setLights({ brightness: 42 });
        assert.deepEqual(JSON.parse(capturedBody), { numberOfLights: 1, lights: [{ brightness: 42 }] });
    });
});
