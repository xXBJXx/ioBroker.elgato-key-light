import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { detectCapabilities } from './capabilities';
import { hsvToRgb, kelvinToMired, miredToKelvin, parseHex, parseRgb, rgbToHex, rgbToHs, rgbToHsv } from './conversions';
import { ElgatoInvalidResponseError, ElgatoTargetError } from './errors';
import { parseAccessoryInfo, parseBattery, parseLights, parseSettings } from './parsers';
import { normalizeTarget, targetBaseUrl } from './target';

describe('Elgato protocol parsing', () => {
    it('normalizes string hardware revisions reported by current firmware', () => {
        const info = parseAccessoryInfo({
            productName: 'Elgato Key Light',
            serialNumber: 'CW30J1A03580',
            displayName: 'Desk',
            hardwareRevision: '1.0',
            features: ['lights'],
        });
        assert.equal(info.hardwareRevision, '1.0');
    });

    it('also normalizes numeric hardware revisions to strings', () => {
        const info = parseAccessoryInfo({
            productName: 'Elgato Key Light Air',
            serialNumber: 'TEST',
            displayName: '',
            hardwareRevision: 1,
        });
        assert.equal(info.hardwareRevision, '1');
    });

    it('rejects malformed required identity fields', () => {
        assert.throws(() => parseAccessoryInfo({ productName: 'Elgato Key Light' }), ElgatoInvalidResponseError);
    });

    it('detects response-driven capabilities', () => {
        const lights = parseLights({
            numberOfLights: 1,
            lights: [{ on: 1, brightness: 70, hue: 120, saturation: 50 }],
        });
        const settings = parseSettings({ battery: { bypass: 1 } });
        assert.deepEqual(detectCapabilities(lights, settings), {
            power: true,
            brightness: true,
            temperature: false,
            color: true,
            battery: true,
            studioMode: true,
            identify: true,
            settings: true,
            multipleLights: false,
            scenes: false,
        });
    });

    it('detects Light Strip RGB controls and scenes without product-name matching', () => {
        const lights = parseLights({
            numberOfLights: 1,
            lights: [{ on: 1, brightness: 60, hue: 210, saturation: 80, numberOfSceneElements: 2, scene: [] }],
        });
        const capabilities = detectCapabilities(lights, undefined, false);
        assert.equal(capabilities.color, true);
        assert.equal(capabilities.temperature, false);
        assert.equal(capabilities.scenes, true);
    });

    it('normalizes Mini battery units and states', () => {
        const battery = parseBattery({
            powerSource: 1,
            level: 78.57,
            status: 2,
            currentBatteryVoltage: 4011,
            inputChargeVoltage: 4208,
            inputChargeCurrent: 3008,
        });
        assert.equal(battery.powerSource, 'mains');
        assert.equal(battery.status, 'charging');
        assert.equal(battery.currentBatteryVoltageV, 4.011);
        assert.equal(battery.inputChargeCurrentA, 3.008);
    });
});

describe('Elgato conversions', () => {
    it('converts and clamps color temperature', () => {
        assert.equal(kelvinToMired(7_000), 143);
        assert.equal(kelvinToMired(2_900), 344);
        assert.equal(miredToKelvin(143), 6_993);
        assert.equal(kelvinToMired(20_000), 143);
    });

    it('round-trips RGB/HSV and parses both color formats', () => {
        const hsv = rgbToHsv({ red: 10, green: 120, blue: 240 });
        const rgb = hsvToRgb(hsv);
        assert.deepEqual(rgb, { red: 10, green: 120, blue: 240 });
        assert.equal(rgbToHex(parseRgb('10, 120, 240')), '#0A78F0');
        assert.deepEqual(parseHex('#0a78f0'), { red: 10, green: 120, blue: 240 });
    });

    it('keeps brightness separate when converting RGB states to a light color update', () => {
        assert.deepEqual(rgbToHs(parseHex('#0000FF')), { hue: 240, saturation: 100 });
        assert.deepEqual(rgbToHs(parseHex('#000080')), { hue: 240, saturation: 100 });
    });
});

describe('Elgato target validation', () => {
    it('accepts private IPs and local hostnames', () => {
        assert.deepEqual(normalizeTarget('192.168.1.20'), { host: '192.168.1.20', port: 9123 });
        assert.deepEqual(normalizeTarget('key-light.local', 9124), { host: 'key-light.local', port: 9124 });
        assert.equal(targetBaseUrl(normalizeTarget('fd00::20')), 'http://[fd00::20]:9123');
        assert.equal(
            targetBaseUrl({ host: 'fe80::20%Ethernet%1', port: 9123 }),
            'http://[fe80::20%25Ethernet%251]:9123',
        );
    });

    it('rejects URLs, public IPs, loopback and invalid ports', () => {
        assert.throws(() => normalizeTarget('http://192.168.1.20'), ElgatoTargetError);
        assert.throws(() => normalizeTarget('8.8.8.8'), ElgatoTargetError);
        assert.throws(() => normalizeTarget('127.0.0.1'), ElgatoTargetError);
        assert.throws(() => normalizeTarget('192.168.1.20', 70_000), ElgatoTargetError);
    });
});
