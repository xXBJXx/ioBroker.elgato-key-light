import { ElgatoApiError, ElgatoConnectionError, ElgatoInvalidResponseError, ElgatoTimeoutError } from './errors';
import { detectCapabilities } from './capabilities';
import { parseAccessoryInfo, parseBattery, parseLights, parseSettings } from './parsers';
import { normalizeTarget, targetBaseUrl } from './target';
import type {
    AccessoryInfo,
    BatteryInfo,
    ElgatoSnapshot,
    ElgatoTarget,
    LightsResponse,
    LightSettings,
    LightUpdate,
} from './types';

export interface ElgatoLogger {
    /**
     *
     */
    debug(message: string): void;
    /**
     *
     */
    silly(message: string): void;
}

export interface ElgatoClientOptions {
    /**
     *
     */
    timeoutMs?: number;
    /**
     *
     */
    maxResponseBytes?: number;
    /**
     *
     */
    fetchImplementation?: typeof fetch;
    /**
     *
     */
    logger?: ElgatoLogger;
}

export class ElgatoClient {
    private readonly baseUrl: string;
    private readonly timeoutMs: number;
    private readonly maxResponseBytes: number;
    private readonly fetchImplementation: typeof fetch;
    private readonly logger: ElgatoLogger | undefined;

    public readonly target: ElgatoTarget;

    /**
     *
     */
    public constructor(host: string, port = 9123, options: ElgatoClientOptions = {}) {
        this.target = normalizeTarget(host, port);
        this.baseUrl = targetBaseUrl(this.target);
        this.timeoutMs = options.timeoutMs ?? 3_000;
        this.maxResponseBytes = options.maxResponseBytes ?? 65_536;
        this.fetchImplementation = options.fetchImplementation ?? fetch;
        this.logger = options.logger;
    }

    /**
     *
     */
    public getAccessoryInfo(): Promise<AccessoryInfo> {
        return this.request('/elgato/accessory-info', 'GET', undefined, parseAccessoryInfo);
    }

    /**
     *
     */
    public setDisplayName(displayName: string): Promise<AccessoryInfo> {
        const value = displayName.trim();
        if (!value || value.length > 128) {
            throw new TypeError('Display name must contain between 1 and 128 characters.');
        }
        return this.request('/elgato/accessory-info', 'PUT', { displayName: value }, parseAccessoryInfo);
    }

    /**
     *
     */
    public getLights(): Promise<LightsResponse> {
        return this.request('/elgato/lights', 'GET', undefined, parseLights);
    }

    /**
     *
     */
    public setLights(update: LightUpdate): Promise<LightsResponse> {
        return this.request('/elgato/lights', 'PUT', { numberOfLights: 1, lights: [update] }, parseLights);
    }

    /**
     *
     */
    public getSettings(): Promise<LightSettings> {
        return this.request('/elgato/lights/settings', 'GET', undefined, parseSettings);
    }

    /**
     *
     */
    public setSettings(update: Record<string, unknown>): Promise<LightSettings> {
        return this.request('/elgato/lights/settings', 'PUT', update, parseSettings);
    }

    /**
     *
     */
    public getBattery(): Promise<BatteryInfo> {
        return this.request('/elgato/battery-info', 'GET', undefined, parseBattery);
    }

    /**
     *
     */
    public async identify(): Promise<void> {
        await this.request('/elgato/identify', 'POST', undefined, () => undefined);
    }

    /**
     *
     */
    public async snapshot(): Promise<ElgatoSnapshot> {
        const [info, lights, settings] = await Promise.all([
            this.getAccessoryInfo(),
            this.getLights(),
            this.getSettings().catch(error => {
                this.logger?.debug(`[ElgatoAPI] settings unavailable: ${errorMessage(error)}`);
                return undefined;
            }),
        ]);
        let battery: BatteryInfo | undefined;
        if (settings?.battery !== undefined) {
            battery = await this.getBattery().catch(error => {
                this.logger?.debug(`[ElgatoAPI] battery info unavailable: ${errorMessage(error)}`);
                return undefined;
            });
        }
        return {
            target: this.target,
            info,
            lights,
            ...(settings === undefined ? {} : { settings }),
            ...(battery === undefined ? {} : { battery }),
            capabilities: detectCapabilities(lights, settings, battery !== undefined),
            capturedAt: new Date().toISOString(),
        };
    }

    private async request<T>(
        path: string,
        method: 'GET' | 'POST' | 'PUT',
        body: unknown,
        parse: (value: unknown) => T,
    ): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        this.logger?.debug(`[ElgatoAPI] ${method} ${url}`);
        try {
            const response = await this.fetchImplementation(url, {
                method,
                headers: {
                    Accept: 'application/json',
                    ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
                },
                ...(body === undefined ? {} : { body: JSON.stringify(body) }),
                signal: AbortSignal.timeout(this.timeoutMs),
            });
            const contentLength = Number(response.headers.get('content-length') ?? 0);
            if (contentLength > this.maxResponseBytes) {
                throw new ElgatoInvalidResponseError(`Response exceeds ${this.maxResponseBytes} bytes.`);
            }
            const text = await response.text();
            if (Buffer.byteLength(text) > this.maxResponseBytes) {
                throw new ElgatoInvalidResponseError(`Response exceeds ${this.maxResponseBytes} bytes.`);
            }
            this.logger?.silly(
                `[ElgatoAPI] ${method} ${url} -> ${response.status}, ${Buffer.byteLength(text)} response bytes`,
            );
            if (!response.ok) {
                throw new ElgatoApiError(`Elgato API returned HTTP ${response.status}.`, response.status);
            }
            if (text === '') {
                return parse(undefined);
            }
            try {
                return parse(JSON.parse(text));
            } catch (error) {
                if (error instanceof ElgatoInvalidResponseError) {
                    throw error;
                }
                throw new ElgatoInvalidResponseError('Elgato API returned invalid JSON.', { cause: error });
            }
        } catch (error) {
            if (error instanceof ElgatoApiError || error instanceof ElgatoInvalidResponseError) {
                throw error;
            }
            if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
                throw new ElgatoTimeoutError(`Elgato request timed out after ${this.timeoutMs} ms.`, { cause: error });
            }
            throw new ElgatoConnectionError(
                `Could not reach Elgato device at ${this.target.host}:${this.target.port}.`,
                {
                    cause: error,
                },
            );
        }
    }
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
