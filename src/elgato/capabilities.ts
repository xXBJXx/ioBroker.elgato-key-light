import type { ElgatoCapabilities, ElgatoSnapshot, LightSettings, LightsResponse } from './types';

export function detectCapabilities(
    lights: LightsResponse,
    settings?: LightSettings,
    hasBattery = false,
): ElgatoCapabilities {
    const states = lights.lights;
    return {
        power: states.some(light => light.on !== undefined),
        brightness: states.some(light => light.brightness !== undefined),
        temperature: states.some(light => light.temperature !== undefined),
        color: states.some(light => light.hue !== undefined && light.saturation !== undefined),
        battery: hasBattery || settings?.battery !== undefined,
        studioMode: settings?.battery?.bypass !== undefined,
        identify: true,
        settings: settings !== undefined,
        multipleLights: (lights.numberOfLights ?? states.length) > 1,
        scenes: states.some(light => Array.isArray(light.scene)),
    };
}

export function withCapabilities(snapshot: Omit<ElgatoSnapshot, 'capabilities'>): ElgatoSnapshot {
    return {
        ...snapshot,
        capabilities: detectCapabilities(snapshot.lights, snapshot.settings, snapshot.battery !== undefined),
    };
}
