"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElgatoDiscovery = void 0;
const bonjour_service_1 = __importDefault(require("bonjour-service"));
class ElgatoDiscovery {
    logger;
    browser;
    bonjour;
    /**
     *
     */
    constructor(logger) {
        this.logger = logger;
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
        this.bonjour = new bonjour_service_1.default(undefined, (error) => {
            this.logger?.warn(`[ElgatoDiscovery] mDNS error: ${error.message}`);
        });
        this.browser = this.bonjour.find({ type: 'elg', protocol: 'tcp' });
        this.browser.on('up', service => {
            const device = serviceToDevice(service);
            const key = device.txt.id || `${device.hostname ?? device.name}:${device.port}`;
            devices.set(key, device);
            this.logger?.debug(`[ElgatoDiscovery] discovered ${device.name} at ${device.addresses.join(', ')}:${device.port}`);
            this.logger?.silly(`[ElgatoDiscovery] service ${device.name}; ${device.addresses.length} address(es); TXT keys: ${Object.keys(device.txt).join(', ')}`);
        });
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
        addresses: [...new Set(service.addresses ?? [])],
        port: service.port || 9123,
        serviceType: '_elg._tcp.local.',
        txt,
    };
}
//# sourceMappingURL=ElgatoDiscovery.js.map