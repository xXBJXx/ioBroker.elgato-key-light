import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sanitizeDiagnostics } from './diagnostics';

describe('sanitizeDiagnostics', () => {
    it('redacts stable identifiers and local network details recursively', () => {
        assert.deepEqual(
            sanitizeDiagnostics({
                host: '192.168.1.2',
                nested: [{ serialNumber: 'ABC', ssid: 'Secret', productName: 'Key Light' }],
            }),
            {
                host: '<redacted>',
                nested: [{ serialNumber: '<redacted>', ssid: '<redacted>', productName: 'Key Light' }],
            },
        );
    });
});
