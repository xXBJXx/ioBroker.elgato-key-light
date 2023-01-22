import React from 'react';
import { Box, Slider } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';

interface BrightnessSliderProps {
	onChange: (value: number) => void;
	value: number;
	min?: number;
	max?: number;
	step?: number;
	defaultValue?: number;
}

export const BrightnessSlider: React.FC<BrightnessSliderProps> = ({
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
			onChange(10);
			console.warn(`Brightness is not a number > ${typeof newValue} < value set to 10`);
		}
	};

	return (
		<Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
			<LightModeIcon
				sx={{
					marginRight: '15px',
					color: '#2c2c2c',
				}}
			/>
			<Slider
				name="brightness"
				defaultValue={defaultValue || 100}
				value={value}
				step={step || 1}
				min={min || 3}
				max={max || 100}
				track={false}
				onChange={handleChange}
				valueLabelDisplay="auto"
				sx={{
					background: `linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(255,255,255,1) 100%)`,
					height: '0',
					padding: '6px 0',
					'& 	.MuiSlider-rail': {
						display: 'none',
					},
				}}
			/>
			<LightModeIcon
				sx={{
					marginLeft: '15px',
					color: '#ffffff',
				}}
			/>
		</Box>
	);
};
