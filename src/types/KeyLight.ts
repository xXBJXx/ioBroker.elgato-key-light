export interface KeyLight {
	ip: string;
	port: number;
	name: string;
	settings?: KeyLightSettings;
	info?: KeyLightInfo;
	light?: KeyLightOptions;
	battery?: KeyLightBattery;
}

export interface AdjustBrightness {
	enable: number;
	brightness: number;
}
export interface EnergySaving {
	enabled: number;
	minimumBatteryLevel: number;
	disableWifi: number;
	adjustBrightness: AdjustBrightness;
}
export interface Battery {
	energySaving: EnergySaving;
	bypass: number;
}
export interface KeyLightSettings {
	powerOnBehavior: number;
	powerOnBrightness: number;
	powerOnTemperature: number;
	switchOnDurationMs: number;
	switchOffDurationMs: number;
	colorChangeDurationMs: number;
	battery?: Battery;
}

export interface WifiInfo {
	ssid: string;
	frequencyMHz: number;
	rssi: number;
}

export interface KeyLightInfo {
	productName: string;
	hardwareBoardType: number;
	firmwareBuildNumber: number;
	firmwareVersion: string;
	serialNumber: string;
	displayName: string;
	features: Array<string>;
	'wifi-info': WifiInfo;
}

export interface KeyLightOptions {
	numberOfLights?: number;
	lights: [
		{
			on?: number;
			brightness?: number;
			temperature?: number;
		},
	];
}

export interface KeyLightBattery {
	powerSource: number;
	level: number;
	status: number;
	currentBatteryVoltage: number;
	inputChargeVoltage: number;
	inputChargeCurrent: number;
}
