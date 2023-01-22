import React from 'react';
import { Box, Slider } from '@mui/material';
import ColorTemp from '@mui/icons-material/DeviceThermostat';

interface ColorTemperatureSliderProps {
	onChange: (value: number) => void;
	value: number;
	min?: number;
	max?: number;
	step?: number;
	defaultValue?: number;
	// props
}

export const ColorTemperatureSlider: React.FC<ColorTemperatureSliderProps> = ({
	onChange,
	value,
	min,
	max,
	step,
	defaultValue,
}): JSX.Element => {
	const handleChange = (event: Event, newValue: number | number[]) => {
		if (typeof newValue === 'number') {
			onChange(newValue);
		} else {
			onChange(2900);
			console.warn(`colorTemperature is not a number > ${typeof newValue} < value set to 2900`);
		}
	};

	return (
		<Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
			<ColorTemp
				sx={{
					marginRight: '15px',
					color: '#FDB167FF',
				}}
			/>
			<Slider
				name="colorTemperature"
				defaultValue={defaultValue || 7000}
				value={value}
				step={step || 50}
				min={min || 2900}
				max={max || 7000}
				track={false}
				onChange={handleChange}
				valueLabelDisplay="auto"
				sx={{
					background: `linear-gradient(90deg, rgba(253,177,103,1) 0%, rgba(255,255,255,1) 70%, rgba(152,208,234,1) 100%)`,
					height: '0',
					padding: '6px 0',
					'& 	.MuiSlider-rail': {
						display: 'none',
					},
				}}
			/>
			<ColorTemp
				sx={{
					marginLeft: '15px',
					color: '#98D0EAFF',
				}}
			/>
		</Box>
	);
};
