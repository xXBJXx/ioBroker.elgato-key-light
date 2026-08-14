"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeTarget = normalizeTarget;
exports.targetBaseUrl = targetBaseUrl;
const node_net_1 = require("node:net");
const errors_1 = require("./errors");
const DEFAULT_PORT = 9123;
const HOSTNAME_PATTERN = /^(?=.{1,253}$)(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)*[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.?$/i;
function isLocalIpv4(host) {
    const octets = host.split('.').map(Number);
    const first = octets[0];
    const second = octets[1];
    if (first === undefined || second === undefined) {
        return false;
    }
    return (first === 10 ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168) ||
        (first === 169 && second === 254));
}
function isLocalIpv6(host) {
    const address = host.split('%', 1)[0]?.toLowerCase() ?? '';
    return (address.startsWith('fc') ||
        address.startsWith('fd') ||
        address.startsWith('fe8') ||
        address.startsWith('fe9') ||
        address.startsWith('fea') ||
        address.startsWith('feb'));
}
function normalizeTarget(hostInput, portInput = DEFAULT_PORT) {
    const host = hostInput
        .trim()
        .replace(/^\[|\]$/g, '')
        .replace(/\.$/, '');
    if (!host || host.includes('://') || /[\\/@?#]/.test(host)) {
        throw new errors_1.ElgatoTargetError('Enter only a local IP address or .local hostname, without a URL or path.');
    }
    if (!Number.isInteger(portInput) || portInput < 1 || portInput > 65_535) {
        throw new errors_1.ElgatoTargetError('The Elgato port must be an integer between 1 and 65535.');
    }
    const addressWithoutZone = host.split('%', 1)[0] ?? host;
    const ipVersion = (0, node_net_1.isIP)(addressWithoutZone);
    const isLocalHostname = HOSTNAME_PATTERN.test(host) && (host.endsWith('.local') || !host.includes('.'));
    if ((ipVersion === 4 && !isLocalIpv4(host)) ||
        (ipVersion === 6 && !isLocalIpv6(host)) ||
        (ipVersion === 0 && !isLocalHostname)) {
        throw new errors_1.ElgatoTargetError('Only private/link-local addresses and local hostnames are accepted.');
    }
    return { host, port: portInput };
}
function targetBaseUrl(target) {
    const addressWithoutZone = target.host.split('%', 1)[0] ?? target.host;
    if ((0, node_net_1.isIP)(addressWithoutZone) === 6) {
        return `http://[${target.host.replace('%', '%25')}]:${target.port}`;
    }
    return `http://${target.host}:${target.port}`;
}
//# sourceMappingURL=target.js.map