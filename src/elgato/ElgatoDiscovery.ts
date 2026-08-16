import { isIP } from 'node:net';

import Bonjour, { type Browser, type Service } from 'bonjour-service';

import { systemTimers, type TimerController } from '../timers';
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

export interface ElgatoDiscoveryOptions {
    interface?: string;
    createBonjour?: (onError: (error: Error) => void, networkInterface?: string) => Bonjour;
    timers?: TimerController;
}

export class ElgatoDiscovery {
    private browser: Browser | undefined;
    private bonjour: Bonjour | undefined;
    private readonly timers: TimerController;
    private waitTimer: unknown;
    private finishWait: (() => void) | undefined;
    private scanId = 0;

    /**
     *
     */
    public constructor(
        private readonly logger?: DiscoveryLogger,
        private readonly options: ElgatoDiscoveryOptions = {},
    ) {
        this.timers = options.timers ?? systemTimers;
    }

    /**
     *
     */
    public async discover(timeoutMs = 5_000): Promise<DiscoveredElgatoDevice[]> {
        if (!Number.isInteger(timeoutMs) || timeoutMs < 250 || timeoutMs > 60_000) {
            throw new RangeError('Discovery timeout must be between 250 and 60000 ms.');
        }
        this.stop();
        const scanId = ++this.scanId;
        const devices = new Map<string, DiscoveredElgatoDevice>();
        const onError = (error: Error): void => {
            this.logger?.warn(`[ElgatoDiscovery] mDNS error: ${error.message}`);
        };
        this.bonjour =
            this.options.createBonjour?.(onError, this.options.interface) ??
            new Bonjour(this.options.interface ? ({ interface: this.options.interface } as never) : undefined, onError);
        this.browser = this.bonjour.find({ type: 'elg', protocol: 'tcp' });
        const remember = (service: Service): void => {
            const device = serviceToDevice(service);
            const key = discoveredDeviceIdentity(device);
            devices.set(key, mergeDiscoveredDevice(devices.get(key), device));
            this.logger?.debug(
                `[ElgatoDiscovery] discovered ${device.name} at ${device.addresses.join(', ')}:${device.port}`,
            );
            this.logger?.silly(
                `[ElgatoDiscovery] service ${device.name}; ${device.addresses.length} address(es); TXT keys: ${Object.keys(device.txt).join(', ')}`,
            );
        };
        this.browser.on('up', remember);
        this.browser.on('txt-update', remember);
        this.browser.on('srv-update', remember);
        this.browser.start();

        await this.wait(timeoutMs);
        if (scanId === this.scanId) {
            this.stop();
        }
        return [...devices.values()].sort((left, right) => left.name.localeCompare(right.name));
    }

    /**
     *
     */
    public stop(): void {
        this.scanId += 1;
        if (this.waitTimer !== undefined) {
            this.timers.clear(this.waitTimer);
            this.waitTimer = undefined;
        }
        const finishWait = this.finishWait;
        this.finishWait = undefined;
        finishWait?.();
        this.browser?.stop();
        this.browser = undefined;
        this.bonjour?.destroy();
        this.bonjour = undefined;
    }

    private wait(timeoutMs: number): Promise<void> {
        return new Promise(resolve => {
            const finish = (): void => {
                this.waitTimer = undefined;
                this.finishWait = undefined;
                resolve();
            };
            this.finishWait = finish;
            this.waitTimer = this.timers.set(finish, timeoutMs);
        });
    }
}

export function serviceToDevice(service: Service): DiscoveredElgatoDevice {
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
        addresses: sortAddresses(service.addresses ?? []),
        port: service.port || 9123,
        serviceType: '_elg._tcp.local.',
        txt,
    };
}

export function discoveredDeviceIdentity(device: DiscoveredElgatoDevice): string {
    return (
        device.txt.id ||
        device.txt.serialNumber ||
        device.txt.serial ||
        `${device.hostname ?? device.name}:${device.port}`
    );
}

export function preferredDiscoveredHost(device: DiscoveredElgatoDevice): string | undefined {
    return device.addresses[0] ?? device.hostname;
}

export function mergeDiscoveredDevice(
    current: DiscoveredElgatoDevice | undefined,
    next: DiscoveredElgatoDevice,
): DiscoveredElgatoDevice {
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

function sortAddresses(addresses: string[]): string[] {
    return [...new Set(addresses.map(address => address.trim()).filter(Boolean))].sort(
        (left, right) => addressRank(left) - addressRank(right) || left.localeCompare(right),
    );
}

function addressRank(address: string): number {
    if (isIP(address) === 4) {
        return 0;
    }
    if (isIP(address.split('%')[0] ?? '') === 6 && !address.toLowerCase().startsWith('fe80:')) {
        return 1;
    }
    return 2;
}
