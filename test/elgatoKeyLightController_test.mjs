import { ElgatoKeyLightController } from '../build/lib/ElgatoKeyLightController.js';

const keyLightController = new ElgatoKeyLightController();

describe(`Elgato Key Light and Elgato Light Strips test`, () => {
	it('teste ob neue Light strips gefunden werden', async () => {
		keyLightController.on('newKeyLight', (newKeyLight) => {
			console.log('New Key Light: ' + newKeyLight.name);
			console.log(newKeyLight);
		});
	});

	it('test die steuerung von den Light Strips', async () => {
		setTimeout(() => {
			keyLightController.updateAllLights({
				numberOfLights: 1,
				lights: [
					{
						on: 1,
						temperature: 145,
						brightness: 15,
					},
				],
			});
		}, 1000 * 3);
	});

	it('teste ob neue Light strips gefunden werden', async () => {
		keyLightController.on('newLightStrip', (newLightStrip) => {
			console.log('New Light Strip: ' + newLightStrip.name);
			console.log(newLightStrip);
		});
	});

	it('test die steuerung von den Light Strips', async () => {
		setTimeout(async () => {
			const result = await keyLightController.updateAllStrips({
				numberOfLights: 1,
				lights: [
					{
						on: 1,
						saturation: 0,
						hue: 100,
						brightness: 100,
					},
				],
			});
			console.log(result);
		}, 1000 * 3);
	});
});
