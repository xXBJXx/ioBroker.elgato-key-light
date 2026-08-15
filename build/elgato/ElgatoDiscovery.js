"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElgatoDiscovery = void 0;
exports.serviceToDevice = serviceToDevice;
exports.discoveredDeviceIdentity = discoveredDeviceIdentity;
exports.preferredDiscoveredHost = preferredDiscoveredHost;
exports.mergeDiscoveredDevice = mergeDiscoveredDevice;
const node_net_1 = require("node:net");
const bonjour_service_1 = __importDefault(require("bonjour-service"));
class ElgatoDiscovery {
    logger;
    options;
    browser;
    bonjour;
    /**
     *
     */
    constructor(logger, options = {}) {
        this.logger = logger;
        this.options = options;
    }
    /**
     *
     */
    async discover(timeoutMs = 5_000) {
        if (!Number.isInteger(timeoutMs) || timeoutMs < 250 || timeoutMs > 60_000) {
            throw new RangeError('Discovery timeout must be between 250 and 60000 ms.');
        }
        this.stop();
        const devices = new Map();
        const onError = (error) => {
            this.logger?.warn(`[ElgatoDiscovery] mDNS error: ${error.message}`);
        };
        this.bonjour =
            this.options.createBonjour?.(onError, this.options.interface) ??
                new bonjour_service_1.default(this.options.interface ? { interface: this.options.interface } : undefined, onError);
        this.browser = this.bonjour.find({ type: 'elg', protocol: 'tcp' });
        const remember = (service) => {
            const device = serviceToDevice(service);
            const key = discoveredDeviceIdentity(device);
            devices.set(key, mergeDiscoveredDevice(devices.get(key), device));
            this.logger?.debug(`[ElgatoDiscovery] discovered ${device.name} at ${device.addresses.join(', ')}:${device.port}`);
            this.logger?.silly(`[ElgatoDiscovery] service ${device.name}; ${device.addresses.length} address(es); TXT keys: ${Object.keys(device.txt).join(', ')}`);
        };
        this.browser.on('up', remember);
        this.browser.on('txt-update', remember);
        this.browser.on('srv-update', remember);
        this.browser.start();
        await new Promise(resolve => setTimeout(resolve, timeoutMs));
        this.stop();
        return [...devices.values()].sort((left, right) => left.name.localeCompare(right.name));
    }
    /**
     *
     */
    stop() {
        this.browser?.stop();
        this.browser = undefined;
        this.bonjour?.destroy();
        this.bonjour = undefined;
    }
}
exports.ElgatoDiscovery = ElgatoDiscovery;
function serviceToDevice(service) {
    const txt = {};
    if (service.txt && typeof service.txt === 'object') {
        for (const [key, value] of Object.entries(service.txt)) {
            if (typeof value === 'string' || typeof value === 'number') {
                txt[key] = String(value);
            }
            else if (Buffer.isBuffer(value)) {
                txt[key] = value.toString('utf8');
            }
        }
    }
    return {
        name: service.name,
        ...(service.host ? { hostname: service.host.replace(/\.$/, '') } : {}),
        addresses: sortAddresses(service.addresses ?? []),
        port: service.port || 9123,
        serviceType: '_elg._tcp.local.',
        txt,
    };
}
function discoveredDeviceIdentity(device) {
    return (device.txt.id ||
        device.txt.serialNumber ||
        device.txt.serial ||
        `${device.hostname ?? device.name}:${device.port}`);
}
function preferredDiscoveredHost(device) {
    return device.addresses[0] ?? device.hostname;
}
function mergeDiscoveredDevice(current, next) {
    if (!current) {
        return next;
    }
    return {
        ...current,
        ...next,
        hostname: next.hostname ?? current.hostname,
        addresses: next.addresses.length > 0 ? sortAddresses(next.addresses) : current.addresses,
        txt: { ...current.txt, ...next.txt },
    };
}
function sortAddresses(addresses) {
    return [...new Set(addresses.map(address => address.trim()).filter(Boolean))].sort((left, right) => addressRank(left) - addressRank(right) || left.localeCompare(right));
}
function addressRank(address) {
    if ((0, node_net_1.isIP)(address) === 4) {
        return 0;
    }
    if ((0, node_net_1.isIP)(address.split('%')[0] ?? '') === 6 && !address.toLowerCase().startsWith('fe80:')) {
        return 1;
    }
    return 2;
}
//# sourceMappingURL=ElgatoDiscovery.js.map