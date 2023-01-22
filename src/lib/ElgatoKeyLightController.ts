import { Bonjour } from 'bonjour-service';
import { EventEmitter } from 'events';
import { KeyLight, KeyLightInfo, KeyLightOptions, KeyLightSettings } from '../types/KeyLight';
import axios from 'axios';
import 'source-map-support/register';
import { LightStrip, LightStripOptions } from '../types/LightStrip';

export class ElgatoKeyLightController extends EventEmitter {
	public keyLights: Array<KeyLight>;
	public lightStrips: Array<LightStrip>;

	/**
	 * Creates an instance of ElgatoKeyLightController.
	 *
	 * @memberof ElgatoKeyLightController
	 */
	constructor() {
		super();

		const bonjour = new Bonjour();
		this.keyLights = [];
		this.lightStrips = [];

		// Continually monitors for a new Key Light to be added
		bonjour.find({ type: 'elg' }, async (service: any) => {
			if (service.txt.md.startsWith('Elgato Key Light')) {
				await this.addKeyLight({
					ip: service['referer'].address,
					port: service.port,
					name: service.name,
				});
			}
			if (service.txt.md.startsWith('Elgato Light Strip')) {
				await this.addKeyLight({
					ip: service['referer'].address,
					port: service.port,
					name: service.name,
				});
			}
		});
	}

	/**
	 * Adds a Key Light instance to our current array
	 *
	 * @private
	 * @param {KeyLight} keyLight
	 * @memberof ElgatoKeyLightController
	 */
	private async addKeyLight(keyLight: KeyLight): Promise<void> {
		try {
			//Grab our Key Light's settings, info, and current options
			const settingsCall = await axios.get(`http://${keyLight.ip}:${keyLight.port}/elgato/lights/settings`);
			keyLight.settings = settingsCall.data;

			const infoCall = await axios.get(`http://${keyLight.ip}:${keyLight.port}/elgato/accessory-info`);
			keyLight.info = infoCall.data;

			const optionsCall = await axios.get(`http://${keyLight.ip}:${keyLight.port}/elgato/lights`);
			keyLight.light = optionsCall.data;

			if (keyLight.info?.productName.startsWith('Elgato Key Light Mini')) {
				const batteryCall = await axios.get(`http://${keyLight.ip}:${keyLight.port}/elgato/battery-info`);
				keyLight.battery = batteryCall.data;
			}

			//Push the Key Light to our array and emit the event
			this.keyLights.push(keyLight);
			this.emit('newKeyLight', keyLight);
			// this.emit('updateKeyLights');
		} catch (e) {
			console.error(e);
		}
	}

	/**
	 * Updates a Key Light to the given options
	 *
	 * @param {KeyLight} device
	 * @returns {Promise<KeyLight | undefined>}
	 * @memberof ElgatoKeyLightController
	 */
	public async requestData(device: KeyLight): Promise<KeyLight> {
		return new Promise(async (resolve, reject) => {
			try {
				//Grab our Keey Light's settings, info, and current options
				const settingsCall = await axios.get(`http://${device.ip}:${device.port}/elgato/lights/settings`);
				device.settings = settingsCall.data;

				const infoCall = await axios.get(`http://${device.ip}:${device.port}/elgato/accessory-info`);
				device.info = infoCall.data;

				const optionsCall = await axios.get(`http://${device.ip}:${device.port}/elgato/lights`);
				device.light = optionsCall.data;

				return resolve(device);
			} catch (error) {
				console.error(error);
				return reject(error);
			}
		});
	}

	/**
	 * Updates a Key Light to the given options
	 *
	 * @param {KeyLight} device
	 * @param {KeyLightOptions} options
	 * @returns {Promise<void>}
	 * @memberof ElgatoKeyLightController
	 */
	public async updateLightOptions(device: KeyLight, options: KeyLightOptions): Promise<unknown> {
		return new Promise(async (resolve, reject) => {
			try {
				const result = await axios.put(`http://${device.ip}:${device.port}/elgato/lights`, options);
				return resolve(result);
			} catch (e) {
				console.error(e);
				return reject(e);
			}
		});
	}

	/**
	 * Updates a Key Light to the given options
	 *
	 * @param {KeyLight} device
	 * @param {KeyLightOptions} options
	 * @returns {Promise<void>}
	 * @memberof ElgatoKeyLightController
	 */
	public async updateLightSettings(device: KeyLight, options: KeyLightSettings): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {
				await axios.put(`http://${device.ip}:${device.port}/elgato/lights/settings`, options);
				return resolve();
			} catch (e) {
				console.error(e);
				return reject(e);
			}
		});
	}

	/**
	 * Updates a Key Light to the given options
	 *
	 * @param {KeyLight} device
	 * @param {KeyLightOptions} options
	 * @returns {Promise<void>}
	 * @memberof ElgatoKeyLightController
	 */
	public async updateLightInfo(device: KeyLight, options: KeyLightInfo): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {
				await axios.put(`http://${device.ip}:${device.port}/elgato/accessory-info`, options);
				return resolve();
			} catch (e) {
				console.error(e);
				return reject(e);
			}
		});
	}

	/**
	 * Updates all lights to the given options
	 *
	 * @param {KeyLightOptions} options
	 * @returns {Promise<void>}
	 * @memberof ElgatoKeyLightController
	 */
	public async updateAllLights(options: KeyLightOptions): Promise<void> {
		return new Promise((resolve, reject) => {
			for (let x = 0; x < this.keyLights.length; x++) {
				this.updateLightOptions(this.keyLights[x], options).catch((e) => {
					return reject(e);
				});
			}
			return resolve();
		});
	}
	/**
	 * Updates all lights to the given options
	 *
	 * @param {LightStripOptions} options
	 * @returns {Promise<void>}
	 * @memberof ElgatoKeyLightController
	 */
	public async updateAllStrips(options: LightStripOptions): Promise<void> {
		return new Promise((resolve, reject) => {
			for (let x = 0; x < this.keyLights.length; x++) {
				this.updateLightOptions(this.keyLights[x], options).catch((e) => {
					return reject(e);
				});
			}
			return resolve();
		});
	}

	public async identify(device: KeyLight): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {
				await axios.post(`http://${device.ip}:${device.port ? device.port : 9123}/elgato/identify`);
				return resolve();
			} catch (e) {
				return reject(e);
			}
		});
	}
}
