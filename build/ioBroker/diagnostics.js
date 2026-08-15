"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeDiagnostics = sanitizeDiagnostics;
const SENSITIVE_KEYS = new Set(['host', 'ip', 'id', 'serialNumber', 'macAddress', 'ssid']);
function sanitizeDiagnostics(value) {
    if (Array.isArray(value)) {
        return value.map(sanitizeDiagnostics);
    }
    if (!value || typeof value !== 'object') {
        return value;
    }
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
        key,
        SENSITIVE_KEYS.has(key) && entry !== undefined ? '<redacted>' : sanitizeDiagnostics(entry),
    ]));
}
//# sourceMappingURL=diagnostics.js.map