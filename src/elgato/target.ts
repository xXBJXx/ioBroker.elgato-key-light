import { isIP } from 'node:net';

import { ElgatoTargetError } from './errors';
import type { ElgatoTarget } from './types';

const DEFAULT_PORT = 9123;
const HOSTNAME_PATTERN = /^(?=.{1,253}$)(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)*[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.?$/i;

function isLocalIpv4(host: string): boolean {
    const octets = host.split('.').map(Number);
    const first = octets[0];
    const second = octets[1];

    if (first === undefined || second === undefined) {
        return false;
    }

    return (
        first === 10 ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168) ||
        (first === 169 && second === 254)
    );
}

function isLocalIpv6(host: string): boolean {
    const address = host.split('%', 1)[0]?.toLowerCase() ?? '';
    return (
        address.startsWith('fc') ||
        address.startsWith('fd') ||
        address.startsWith('fe8') ||
        address.startsWith('fe9') ||
        address.startsWith('fea') ||
        address.startsWith('feb')
    );
}

export function normalizeTarget(hostInput: string, portInput: number = DEFAULT_PORT): ElgatoTarget {
    const host = hostInput
        .trim()
        .replace(/^\[|\]$/g, '')
        .replace(/\.$/, '');

    if (!host || host.includes('://') || /[\\/@?#]/.test(host)) {
        throw new ElgatoTargetError('Enter only a local IP address or .local hostname, without a URL or path.');
    }

    if (!Number.isInteger(portInput) || portInput < 1 || portInput > 65_535) {
        throw new ElgatoTargetError('The Elgato port must be an integer between 1 and 65535.');
    }

    const addressWithoutZone = host.split('%', 1)[0] ?? host;
    const ipVersion = isIP(addressWithoutZone);
    const isLocalHostname = HOSTNAME_PATTERN.test(host) && (host.endsWith('.local') || !host.includes('.'));

    if (
        (ipVersion === 4 && !isLocalIpv4(host)) ||
        (ipVersion === 6 && !isLocalIpv6(host)) ||
        (ipVersion === 0 && !isLocalHostname)
    ) {
        throw new ElgatoTargetError('Only private/link-local addresses and local hostnames are accepted.');
    }

    return { host, port: portInput };
}

export function targetBaseUrl(target: ElgatoTarget): string {
    const addressWithoutZone = target.host.split('%', 1)[0] ?? target.host;
    if (isIP(addressWithoutZone) === 6) {
        return `http://[${target.host.replace('%', '%25')}]:${target.port}`;
    }
    return `http://${target.host}:${target.port}`;
}
