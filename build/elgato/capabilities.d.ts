import type { ElgatoCapabilities, ElgatoSnapshot, LightSettings, LightsResponse } from './types';
export declare function detectCapabilities(lights: LightsResponse, settings?: LightSettings, hasBattery?: boolean): ElgatoCapabilities;
export declare function withCapabilities(snapshot: Omit<ElgatoSnapshot, 'capabilities'>): ElgatoSnapshot;
