export interface LightStrip {
	ip: string;
	port: number;
	name: string;
	settings?: LightStripSettings;
	info?: LightStripInfo;
	light?: LightStripOptions;
}

export interface LightStripSettings {
	powerOnBehavior: number;
	powerOnBrightness: number;
	powerOnTemperature: number;
	switchOnDurationMs: number;
	switchOffDurationMs: number;
	colorChangeDurationMs: number;
}

export interface LightStripInfo {
	productName: string;
	hardwareBoardType: number;
	firmwareBuildNumber: number;
	firmwareVersion: string;
	serialNumber: string;
	displayName: string;
	features: Array<string>;
}

export interface Scene {
	hue: number;
	saturation: number;
	durationMs: number;
	transitionMS: number;
}

export interface LightStripOptions {
	numberOfLights?: number;
	lights: [
		{
			on?: number;
			id?: number;
			hue?: number;
			name?: string;
			saturation?: number;
			brightness?: number;
			numberOfSceneElements?: number;
			scene?: Scene[];
		},
	];
}
