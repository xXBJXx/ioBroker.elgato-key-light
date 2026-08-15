const SENSITIVE_KEYS = new Set(['host', 'ip', 'id', 'serialNumber', 'macAddress', 'ssid']);

export function sanitizeDiagnostics(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sanitizeDiagnostics);
    }
    if (!value || typeof value !== 'object') {
        return value;
    }
    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
            key,
            SENSITIVE_KEYS.has(key) && entry !== undefined ? '<redacted>' : sanitizeDiagnostics(entry),
        ]),
    );
}
