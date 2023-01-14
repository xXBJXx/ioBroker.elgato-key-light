// hue-sync-box API https://developers.meethue.com/develop/hue-entertainment/hue-hdmi-sync-box-api/#Device%20Discovery

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from '@iobroker/adapter-core';
// Load your modules here, e.g.:
import 'source-map-support/register';

// Global variables here

class ElgatoKeyLight extends utils.Adapter {
	private requestTimer: ioBroker.Timeout | null;
	private subscribedStates: string[];
	private messageHandler: any[];
	private messageHandlerTimer: ioBroker.Timeout | null;

	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: 'elgato-key-light',
		});
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
		this.requestTimer = null;
		this.messageHandlerTimer = null;
		this.subscribedStates = [];
		this.messageHandler = [];
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	private async onReady(): Promise<void> {
		// Initialize your adapter here
		this.messageHandler = [];
		// Reset the connection indicator during startup
		this.setState('info.connection', false, true);
	}

	/**
	 * @description a function for log output
	 */
	private writeLog(logText: string, logType: 'silly' | 'info' | 'debug' | 'warn' | 'error'): void {
		if (logType === 'warn' || logType === 'error') {
			if (this.messageHandler.length > 0) {
				// check if the logText is not in the messageHandler
				if (!this.messageHandler.find((message) => message.message === logText)) {
					// push the logText to the messageHandler
					this.messageHandler.push({
						severity: logType,
						clearTimer: false,
						message: logText,
					});
					if (logType === 'warn') this.log.warn(logText);
					if (logType === 'error') this.log.error(logText);
					this.log.debug(
						`[Adapter v.${this.version} writeLog] messageHandler: ` + JSON.stringify(this.messageHandler),
					);
				} else {
					if (!this.messageHandler.find((message) => message.message === logText).clearTimer) {
						// set the clearTimer to true
						this.messageHandler.find((message) => message.message === logText).clearTimer = true;
						// set the clearTimer to false and clear the messageHandler for the logText after 5 min
						this.messageHandlerTimer = this.setTimeout(() => {
							this.messageHandler.find((message) => message.message === logText).clearTimer = false;
							this.messageHandler = this.messageHandler.filter((message) => message.message !== logText);
							this.log.debug(`[Adapter v.${this.version} writeLog] clear messageHandler for ${logText}`);
						}, 300000);
					}
					this.log.debug(
						`[Adapter v.${this.version} writeLog] messageHandler: ` + JSON.stringify(this.messageHandler),
					);
				}
			} else {
				// push the logText to the messageHandler
				this.messageHandler.push({
					severity: logType,
					clearTimer: false,
					message: logText,
				});
				if (logType === 'warn') this.log.warn(logText);
				if (logType === 'error') this.log.error(logText);
				this.log.debug(
					`[Adapter v.${this.version} writeLog] messageHandler: ` + JSON.stringify(this.messageHandler),
				);
			}
		} else {
			if (logType === 'silly') this.log.silly(logText);
			if (logType === 'info') this.log.info(logText);
			if (logType === 'debug') this.log.debug(logText);
		}
	}

	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  */
	private async onMessage(obj: ioBroker.Message): Promise<void> {
		if (typeof obj === 'object' && obj.message) {
			if (obj.command === 'send') {
				// e.g. send email or pushover or whatever
				this.log.info('send command');

				// Send response in callback if required
				if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
			}
		}
	}

	/**
	 * Is called if a subscribed state changes
	 */
	private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
		if (state) {
			if (state.from === 'system.adapter.' + this.namespace) {
				// ignore the state change from the adapter itself
				return;
			} else {
				// The state was changed
				this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
			}
		} else {
			return;
		}
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 */
	private async onUnload(callback: () => void): Promise<void> {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			if (this.requestTimer) this.clearTimeout(this.requestTimer);
			if (this.messageHandlerTimer) this.clearTimeout(this.messageHandlerTimer);
			this.setState('info.connection', false, true);
			// for (const devicesKey in this.config.devices) {
			// 	this.setState(
			// 		`box_${await replaceFunktion(this.config.devices[devicesKey].name)}.reachable`,
			// 		false,
			// 		true,
			// 	);
			// }

			callback();
		} catch (e) {
			callback();
		}
	}
}

if (require.main !== module) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new ElgatoKeyLight(options);
} else {
	// otherwise start the instance directly
	(() => new ElgatoKeyLight())();
}
