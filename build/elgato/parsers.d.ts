import type { AccessoryInfo, BatteryInfo, LightSettings, LightsResponse } from './types';
export declare function parseAccessoryInfo(value: unknown): AccessoryInfo;
export declare function parseLights(value: unknown): LightsResponse;
export declare function parseSettings(value: unknown): LightSettings;
export declare function parseBattery(value: unknown): BatteryInfo;
