import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { describe, it } from 'node:test';

import type Bonjour from 'bonjour-service';
import type { Browser, Service } from 'bonjour-service';

import {
    discoveredDeviceIdentity,
    ElgatoDiscovery,
    mergeDiscoveredDevice,
    preferredDiscoveredHost,
    serviceToDevice,
} from './ElgatoDiscovery';

function service(overrides: Partial<Service> = {}): Service {
    return {
        name: 'Elgato Light',
        type: 'elg',
        protocol: 'tcp',
        host: 'light.local.',
        port: 9123,
        addresses: ['fe80::1', '192.168.1.40', '192.168.1.40'],
        txt: { id: 'SERIAL-1' },
        fqdn: 'Elgato Light._elg._tcp.local.',
        referer: { address: '192.168.1.40', family: 'IPv4', port: 5353, size: 0 },
        ...overrides,
    } as Service;
}

describe('ElgatoDiscovery', () => {
    it('normalizes TXT data and prefers IPv4 over IPv6/link-local addresses', () => {
        const device = serviceToDevice(service());
        assert.deepEqual(device.addresses, ['192.168.1.40', 'fe80::1']);
        assert.equal(preferredDiscoveredHost(device), '192.168.1.40');
        assert.equal(discoveredDeviceIdentity(device), 'SERIAL-1');
    });

    it('merges duplicate announcements and replaces stale addresses after an address change', () => {
        const first = serviceToDevice(service());
        const changed = serviceToDevice(
            service({ addresses: ['fd00::42', '192.168.1.41'], txt: { id: 'SERIAL-1', version: '2' } }),
        );
        const merged = mergeDiscoveredDevice(first, changed);
        assert.deepEqual(merged.addresses, ['192.168.1.41', 'fd00::42']);
        assert.equal(merged.txt.version, '2');
    });

    it('collects repeated mDNS update events without using multicast', async () => {
        const emitter = new EventEmitter();
        const browser = emitter as unknown as Browser;
        browser.start = () => undefined;
        browser.stop = () => undefined;
        const fakeBonjour = {
            find: () => browser,
            destroy: () => undefined,
        } as unknown as Bonjour;
        const discovery = new ElgatoDiscovery(undefined, { createBonjour: () => fakeBonjour });
        const pending = discovery.discover(250);
        emitter.emit('up', service());
        emitter.emit('srv-update', service({ addresses: ['192.168.1.41'] }));
        const devices = await pending;
        assert.equal(devices.length, 1);
        assert.deepEqual(devices[0]?.addresses, ['192.168.1.41']);
    });

    it('passes an explicitly selected network interface to the mDNS backend', async () => {
        let selectedInterface: string | undefined;
        const emitter = new EventEmitter();
        const browser = emitter as unknown as Browser;
        browser.start = () => undefined;
        browser.stop = () => undefined;
        const fakeBonjour = { find: () => browser, destroy: () => undefined } as unknown as Bonjour;
        const discovery = new ElgatoDiscovery(undefined, {
            interface: '192.168.1.15',
            createBonjour: (_onError, networkInterface) => {
                selectedInterface = networkInterface;
                return fakeBonjour;
            },
        });
        await discovery.discover(250);
        assert.equal(selectedInterface, '192.168.1.15');
    });
});
