"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElgatoClient = void 0;
const errors_1 = require("./errors");
const capabilities_1 = require("./capabilities");
const parsers_1 = require("./parsers");
const target_1 = require("./target");
class ElgatoClient {
    baseUrl;
    timeoutMs;
    maxResponseBytes;
    fetchImplementation;
    logger;
    target;
    /**
     *
     */
    constructor(host, port = 9123, options = {}) {
        this.target = (0, target_1.normalizeTarget)(host, port);
        this.baseUrl = (0, target_1.targetBaseUrl)(this.target);
        this.timeoutMs = options.timeoutMs ?? 3_000;
        this.maxResponseBytes = options.maxResponseBytes ?? 65_536;
        this.fetchImplementation = options.fetchImplementation ?? fetch;
        this.logger = options.logger;
    }
    /**
     *
     */
    getAccessoryInfo() {
        return this.request('/elgato/accessory-info', 'GET', undefined, parsers_1.parseAccessoryInfo);
    }
    /**
     *
     */
    setDisplayName(displayName) {
        const value = displayName.trim();
        if (!value || value.length > 128) {
            throw new TypeError('Display name must contain between 1 and 128 characters.');
        }
        return this.request('/elgato/accessory-info', 'PUT', { displayName: value }, parsers_1.parseAccessoryInfo);
    }
    /**
     *
     */
    getLights() {
        return this.request('/elgato/lights', 'GET', undefined, parsers_1.parseLights);
    }
    /**
     *
     */
    setLights(update, lightIndex = 0) {
        if (!Number.isInteger(lightIndex) || lightIndex < 0) {
            throw new RangeError('Light index must be a non-negative integer.');
        }
        return this.request('/elgato/lights', 'PUT', { numberOfLights: 1, lights: [{ ...update, id: lightIndex }] }, parsers_1.parseLights);
    }
    /**
     *
     */
    getSettings() {
        return this.request('/elgato/lights/settings', 'GET', undefined, parsers_1.parseSettings);
    }
    /**
     *
     */
    setSettings(update) {
        return this.request('/elgato/lights/settings', 'PUT', update, parsers_1.parseSettings);
    }
    /**
     *
     */
    getBattery() {
        return this.request('/elgato/battery-info', 'GET', undefined, parsers_1.parseBattery);
    }
    /**
     *
     */
    async identify() {
        await this.request('/elgato/identify', 'POST', undefined, () => undefined);
    }
    /**
     *
     */
    async snapshot() {
        const [info, lights, settings] = await Promise.all([
            this.getAccessoryInfo(),
            this.getLights(),
            this.getSettings().catch(error => {
                this.logger?.debug(`[ElgatoAPI] settings unavailable: ${errorMessage(error)}`);
                return undefined;
            }),
        ]);
        let battery;
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
            capabilities: (0, capabilities_1.detectCapabilities)(lights, settings, battery !== undefined),
            capturedAt: new Date().toISOString(),
        };
    }
    async request(path, method, body, parse) {
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
                throw new errors_1.ElgatoInvalidResponseError(`Response exceeds ${this.maxResponseBytes} bytes.`);
            }
            const text = await response.text();
            if (Buffer.byteLength(text) > this.maxResponseBytes) {
                throw new errors_1.ElgatoInvalidResponseError(`Response exceeds ${this.maxResponseBytes} bytes.`);
            }
            this.logger?.silly(`[ElgatoAPI] ${method} ${url} -> ${response.status}, ${Buffer.byteLength(text)} response bytes`);
            if (!response.ok) {
                throw new errors_1.ElgatoApiError(`Elgato API returned HTTP ${response.status}.`, response.status);
            }
            if (text === '') {
                return parse(undefined);
            }
            try {
                return parse(JSON.parse(text));
            }
            catch (error) {
                if (error instanceof errors_1.ElgatoInvalidResponseError) {
                    throw error;
                }
                throw new errors_1.ElgatoInvalidResponseError('Elgato API returned invalid JSON.', { cause: error });
            }
        }
        catch (error) {
            if (error instanceof errors_1.ElgatoApiError || error instanceof errors_1.ElgatoInvalidResponseError) {
                throw error;
            }
            if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
                throw new errors_1.ElgatoTimeoutError(`Elgato request timed out after ${this.timeoutMs} ms.`, { cause: error });
            }
            throw new errors_1.ElgatoConnectionError(`Could not reach Elgato device at ${this.target.host}:${this.target.port}.`, {
                cause: error,
            });
        }
    }
}
exports.ElgatoClient = ElgatoClient;
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
//# sourceMappingURL=ElgatoClient.js.map