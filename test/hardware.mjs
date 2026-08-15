import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ElgatoClient } from '../build/elgato/ElgatoClient.js';

const targets = (process.env.ELGATO_TEST_DEVICES ?? process.env.ELGATO_TEST_DEVICE ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
const allowWrites = process.env.ELGATO_TEST_WRITE === '1';

test('opt-in Elgato hardware smoke test', { skip: targets.length === 0 ? 'Set ELGATO_TEST_DEVICE(S).' : false }, async t => {
    for (const target of targets) {
        await t.test(target.replace(/\d/g, 'x'), async () => {
            const separator = target.lastIndexOf(':');
            const hasPort = separator > -1 && !target.includes(']');
            const host = hasPort ? target.slice(0, separator) : target;
            const port = hasPort ? Number(target.slice(separator + 1)) : Number(process.env.ELGATO_TEST_PORT ?? 9123);
            const client = new ElgatoClient(host, port, { timeoutMs: Number(process.env.ELGATO_TEST_TIMEOUT ?? 5000) });
            const original = await client.snapshot();
            assert.ok(original.info.productName);
            assert.ok(original.info.serialNumber);
            assert.ok(original.lights.lights.length > 0);
            if (!allowWrites) return;

            const light = original.lights.lights[0];
            assert.ok(light);
            try {
                if (original.capabilities.power && light.on !== undefined) {
                    await client.setLights({ on: light.on === 1 ? 0 : 1 });
                }
                if (original.capabilities.brightness && light.brightness !== undefined) {
                    await client.setLights({ brightness: Math.max(1, Math.min(100, light.brightness === 50 ? 51 : 50)) });
                }
                if (original.capabilities.color && light.hue !== undefined && light.saturation !== undefined) {
                    const brightnessBeforeColor = (await client.getLights()).lights[0]?.brightness;
                    await client.setLights({ hue: (light.hue + 30) % 360, saturation: light.saturation });
                    const changed = await client.getLights();
                    assert.equal(changed.lights[0]?.brightness, brightnessBeforeColor, 'color-only write changed brightness');
                }
                if (original.capabilities.studioMode && original.settings?.battery?.bypass !== undefined) {
                    await client.setSettings({ battery: { bypass: original.settings.battery.bypass ? 0 : 1 } });
                }
                if (original.capabilities.identify) await client.identify();
            } finally {
                await client.setLights({
                    ...(light.on === undefined ? {} : { on: light.on }),
                    ...(light.brightness === undefined ? {} : { brightness: light.brightness }),
                    ...(light.temperature === undefined ? {} : { temperature: light.temperature }),
                    ...(light.hue === undefined ? {} : { hue: light.hue }),
                    ...(light.saturation === undefined ? {} : { saturation: light.saturation }),
                });
                if (original.capabilities.studioMode && original.settings?.battery?.bypass !== undefined) {
                    await client.setSettings({ battery: { bypass: original.settings.battery.bypass ? 1 : 0 } });
                }
            }
        });
    }
});
