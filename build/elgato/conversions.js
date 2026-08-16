"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kelvinToMired = kelvinToMired;
exports.miredToKelvin = miredToKelvin;
exports.rgbToHsv = rgbToHsv;
exports.rgbToHs = rgbToHs;
exports.hsvToRgb = hsvToRgb;
exports.rgbToHex = rgbToHex;
exports.parseRgb = parseRgb;
exports.parseHex = parseHex;
const MIN_MIRED = 143;
const MAX_MIRED = 344;
const MIN_KELVIN = 2_900;
const MAX_KELVIN = 7_000;
function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
}
function kelvinToMired(kelvin) {
    if (!Number.isFinite(kelvin)) {
        throw new TypeError('Kelvin must be a finite number.');
    }
    return clamp(Math.round(1_000_000 / clamp(kelvin, MIN_KELVIN, MAX_KELVIN)), MIN_MIRED, MAX_MIRED);
}
function miredToKelvin(mired) {
    if (!Number.isFinite(mired)) {
        throw new TypeError('Mired must be a finite number.');
    }
    return Math.round(1_000_000 / clamp(mired, MIN_MIRED, MAX_MIRED));
}
function rgbToHsv({ red, green, blue }) {
    const [r, g, b] = [red, green, blue].map(channel => clamp(channel, 0, 255) / 255);
    const maximum = Math.max(r, g, b);
    const minimum = Math.min(r, g, b);
    const delta = maximum - minimum;
    let hue = 0;
    if (delta !== 0) {
        if (maximum === r) {
            hue = 60 * (((g - b) / delta) % 6);
        }
        else if (maximum === g) {
            hue = 60 * ((b - r) / delta + 2);
        }
        else {
            hue = 60 * ((r - g) / delta + 4);
        }
    }
    if (hue < 0) {
        hue += 360;
    }
    return {
        hue,
        saturation: maximum === 0 ? 0 : (delta / maximum) * 100,
        value: maximum * 100,
    };
}
function rgbToHs(color) {
    const { hue, saturation } = rgbToHsv(color);
    return { hue, saturation };
}
function hsvToRgb({ hue, saturation, value }) {
    const normalizedHue = ((hue % 360) + 360) % 360;
    const s = clamp(saturation, 0, 100) / 100;
    const v = clamp(value, 0, 100) / 100;
    const chroma = v * s;
    const x = chroma * (1 - Math.abs(((normalizedHue / 60) % 2) - 1));
    const m = v - chroma;
    const sector = Math.floor(normalizedHue / 60);
    const values = [
        [chroma, x, 0],
        [x, chroma, 0],
        [0, chroma, x],
        [0, x, chroma],
        [x, 0, chroma],
        [chroma, 0, x],
    ];
    const [r, g, b] = values[sector] ?? values[0];
    return { red: Math.round((r + m) * 255), green: Math.round((g + m) * 255), blue: Math.round((b + m) * 255) };
}
function rgbToHex(color) {
    return `#${[color.red, color.green, color.blue]
        .map(channel => Math.round(clamp(channel, 0, 255))
        .toString(16)
        .padStart(2, '0'))
        .join('')}`.toUpperCase();
}
function parseRgb(value) {
    const parts = value.split(',').map(part => Number(part.trim()));
    if (parts.length !== 3 || parts.some(part => !Number.isFinite(part) || part < 0 || part > 255)) {
        throw new TypeError('RGB must contain three comma-separated values between 0 and 255.');
    }
    return { red: parts[0], green: parts[1], blue: parts[2] };
}
function parseHex(value) {
    const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value.trim());
    if (!match) {
        throw new TypeError('Hex color must use the format #RRGGBB.');
    }
    return {
        red: Number.parseInt(match[1], 16),
        green: Number.parseInt(match[2], 16),
        blue: Number.parseInt(match[3], 16),
    };
}
//# sourceMappingURL=conversions.js.map