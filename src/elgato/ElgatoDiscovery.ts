import Bonjour, { type Browser, type Service } from 'bonjour-service';

import type { DiscoveredElgatoDevice } from './types';

export interface DiscoveryLogger {
    /**
     *
     */
    debug(message: string): void;
    /**
     *
     */
    silly(message: string): void;
    /**
     *
     */
    warn(message: string): void;
}

export class ElgatoDiscovery {
    private browser: Browser | undefined;
    private bonjour: Bonjour | undefined;

    /**
     *
     */
    public constructor(private readonly logger?: DiscoveryLogger) {}

    /**
     *
     */
    public async discover(timeoutMs = 5_000): Promise<DiscoveredElgatoDevice[]> {
        if (!Number.isInteger(timeoutMs) || timeoutMs < 250 || timeoutMs > 60_000) {
            throw new RangeError('Discovery timeout must be between 250 and 60000 ms.');
        }
        this.stop();
        const devices = new Map<string, DiscoveredElgatoDevice>();
        this.bonjour = new Bonjour(undefined, (error: Error) => {
            this.logger?.warn(`[ElgatoDiscovery] mDNS error: ${error.message}`);
        });
        this.browser = this.bonjour.find({ type: 'elg', protocol: 'tcp' });
        this.browser.on('up', service => {
            const device = serviceToDevice(service);
            const key = device.txt.id || `${device.hostname ?? device.name}:${device.port}`;
            devices.set(key, device);
            this.logger?.debug(
                `[ElgatoDiscovery] discovered ${device.name} at ${device.addresses.join(', ')}:${device.port}`,
            );
            this.logger?.silly(
                `[ElgatoDiscovery] service ${device.name}; ${device.addresses.length} address(es); TXT keys: ${Object.keys(device.txt).join(', ')}`,
            );
        });
        this.browser.start();

        await new Promise<void>(resolve => setTimeout(resolve, timeoutMs));
        this.stop();
        return [...devices.values()].sort((left, right) => left.name.localeCompare(right.name));
    }

    /**
     *
     */
    public stop(): void {
        this.browser?.stop();
        this.browser = undefined;
        this.bonjour?.destroy();
        this.bonjour = undefined;
    }
}

function serviceToDevice(service: Service): DiscoveredElgatoDevice {
    const txt: Record<string, string> = {};
    if (service.txt && typeof service.txt === 'object') {
        for (const [key, value] of Object.entries(service.txt as Record<string, unknown>)) {
            if (typeof value === 'string' || typeof value === 'number') {
                txt[key] = String(value);
            } else if (Buffer.isBuffer(value)) {
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
