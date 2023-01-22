export function hsbToHex(hue: number, saturation: number, brightness: number): string {
	// Convert hue from degrees to a value between 0 and 1
	const h = hue / 360;
	// Convert saturation from percentage to a value between 0 and 1
	const s = saturation / 100;
	// Convert brightness from percentage to a value between 0 and 1
	let b = brightness / 100;

	let r = 0,
		g = 0;
	const i = Math.floor(h * 6);
	const f = h * 6 - i;
	const p = b * (1 - s);
	const q = b * (1 - f * s);
	const t = b * (1 - (1 - f) * s);
	switch (i % 6) {
		case 0:
			(r = b), (g = t), (b = p);
			break;
		case 1:
			(r = q), (g = b), (b = p);
			break;
		case 2:
			(r = p), (g = b), (b = t);
			break;
		case 3:
			(r = p), (g = q), (b = b);
			break;
		case 4:
			(r = t), (g = p), (b = b);
			break;
		case 5:
			(r = b), (g = p), (b = q);
			break;
	}
	const red = Math.round(r * 255)
		.toString(16)
		.padStart(2, '0');
	const green = Math.round(g * 255)
		.toString(16)
		.padStart(2, '0');
	const blue = Math.round(b * 255)
		.toString(16)
		.padStart(2, '0');
	return `#${red}${green}${blue}`;
}

export function hexToHsb(hex: string): [number, number, number] {
	const r = parseInt(hex.substring(1, 3), 16) / 255;
	const g = parseInt(hex.substring(3, 5), 16) / 255;
	let b = parseInt(hex.substring(5, 7), 16) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	if (max === min) {
		h = 0;
	} else if (max === r) {
		h = 60;
		h = 60 * (0 + (g - b) / (max - min));
	} else if (max === g) {
		h = 60 * (2 + (b - r) / (max - min));
	} else if (max === b) {
		h = 60 * (4 + (r - g) / (max - min));
	}
	if (h < 0) {
		h += 360;
	}
	s = max === 0 ? 0 : (max - min) / max;
	b = max;
	return [h, s * 100, b * 100];
}

export function hsbToRgb(hue: number, saturation: number, brightness: number): string {
	// Convert hue from degrees to a value between 0 and 1
	const h = hue / 360;
	// Convert saturation from percentage to a value between 0 and 1
	const s = saturation / 100;
	// Convert brightness from percentage to a value between 0 and 1
	let b = brightness / 100;

	let r = 0,
		g = 0;
	const i = Math.floor(h * 6);
	const f = h * 6 - i;
	const p = b * (1 - s);
	const q = b * (1 - f * s);
	const t = b * (1 - (1 - f) * s);
	switch (i % 6) {
		case 0:
			(r = b), (g = t), (b = p);
			break;
		case 1:
			(r = q), (g = b), (b = p);
			break;
		case 2:
			(r = p), (g = b), (b = t);
			break;
		case 3:
			(r = p), (g = q), (b = b);
			break;
		case 4:
			(r = t), (g = p), (b = b);
			break;
		case 5:
			(r = b), (g = p), (b = q);
			break;
	}
	return `${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}`;
}

export function rgbToHsb(r: number, g: number, b: number): [number, number, number] {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	let v = 0;
	v = max;
	const d = max - min;
	s = max === 0 ? 0 : d / max;
	if (max === min) {
		h = 0;
	} else {
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h /= 6;
	}
	return [h * 360, s * 100, v * 100];
}
