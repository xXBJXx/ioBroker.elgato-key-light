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
    for (const fixture of [
        {
            productName: 'Elgato Key Light Air',
            serialNumber: 'AIR-1',
            light: { on: 1, brightness: 55, temperature: 220 },
            expected: { temperature: true, color: false },
        },
        {
            productName: 'Elgato Ring Light',
            serialNumber: 'RING-1',
            light: { on: 1, brightness: 55, temperature: 220 },
            expected: { temperature: true, color: false },
        },
    ]) {
        it(`collects a capability-driven ${fixture.productName} fixture`, async () => {
            const client = new ElgatoClient('192.168.1.20', 9123, {
                fetchImplementation: async input => {
                    const url = String(input);
                    if (url.endsWith('/accessory-info')) {
                        return jsonResponse({
                            productName: fixture.productName,
                            serialNumber: fixture.serialNumber,
                            displayName: fixture.productName,
                            features: ['lights'],
                        });
                    }
                    if (url.endsWith('/lights/settings')) {
                        return jsonResponse({ powerOnBrightness: 20 });
                    }
                    return jsonResponse({ numberOfLights: 1, lights: [fixture.light] });
                },
            });
            const result = await client.snapshot();
            assert.equal(result.info.serialNumber, fixture.serialNumber);
            assert.equal(result.capabilities.temperature, fixture.expected.temperature);
            assert.equal(result.capabilities.color, fixture.expected.color);
        });
    }

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

    it('accepts an empty successful response when updating Mini settings', async () => {
        let capturedBody = '';
        const client = new ElgatoClient('192.168.1.15', 9123, {
            fetchImplementation: async (_input, init) => {
                capturedBody = String(init?.body);
                return new Response(null, { status: 204 });
            },
        });

        const result = await client.setSettings({ battery: { bypass: 1 } });

        assert.deepEqual(result, {});
        assert.deepEqual(JSON.parse(capturedBody), { battery: { bypass: 1 } });
    });

    it('runs a mocked full read/write/identify HTTP workflow', async () => {
        const calls: Array<{ path: string; method: string; body?: unknown }> = [];
        let light = { on: 1, brightness: 40, hue: 120, saturation: 80 };
        const client = new ElgatoClient('192.168.1.50', 9123, {
            fetchImplementation: async (input, init) => {
                const path = new URL(String(input)).pathname;
                const method = init?.method ?? 'GET';
                const body = init?.body ? JSON.parse(String(init.body)) : undefined;
                calls.push({ path, method, ...(body === undefined ? {} : { body }) });
                if (path.endsWith('/accessory-info')) {
                    return jsonResponse({
                        productName: 'Elgato Light Strip',
                        serialNumber: 'STRIP-1',
                        displayName: 'Strip',
                        features: ['lights'],
                    });
                }
                if (path.endsWith('/lights/settings')) {
                    return jsonResponse({ colorChangeDurationMs: 100 });
                }
                if (path.endsWith('/identify')) {
                    return new Response(null, { status: 204 });
                }
                if (method === 'PUT') {
                    light = { ...light, ...(body as { lights: [Partial<typeof light>] }).lights[0] };
                }
                return jsonResponse({ numberOfLights: 1, lights: [light] });
            },
        });
        const before = await client.snapshot();
        await client.setLights({ hue: 240, saturation: 100 });
        await client.identify();
        const after = await client.getLights();
        assert.equal(before.capabilities.color, true);
        assert.equal(after.lights[0]?.brightness, 40);
        assert.equal(after.lights[0]?.hue, 240);
        assert.ok(calls.some(call => call.path.endsWith('/identify') && call.method === 'POST'));
    });
});
