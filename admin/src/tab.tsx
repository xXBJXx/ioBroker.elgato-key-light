import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import type { Translations } from 'iobroker-react/i18n';
import { IoBrokerApp } from 'iobroker-react/app';
import { useAdapter, useGlobals, useI18n, useIoBrokerObject, useIoBrokerState } from 'iobroker-react/hooks';
import { Logo, NumberInput } from 'iobroker-react';
import { Box, Grid, Stack, Typography } from '@mui/material';
import { KeyLight } from '../../src/types/KeyLight';
import { BoxCard } from './components/BoxCard';
import { orange, red } from '@mui/material/colors';
import { SaveButton } from './components/SaveButton';
import { Spacer } from './components/Spacer';
// Components are imported here

// Load your translations
const translations: Translations = {
	en: require('./i18n/en.json'),
	de: require('./i18n/de.json'),
	ru: require('./i18n/ru.json'),
	pt: require('./i18n/pt.json'),
	nl: require('./i18n/nl.json'),
	fr: require('./i18n/fr.json'),
	it: require('./i18n/it.json'),
	es: require('./i18n/es.json'),
	pl: require('./i18n/pl.json'),
	'zh-cn': require('./i18n/zh-cn.json'),
};

const Root: React.FC = () => {
	const { translate: t } = useI18n();
	const { alive } = useAdapter();
	const { namespace } = useGlobals();
	const [myObject, extendMyObject] = useIoBrokerObject(`system.adapter.${namespace}`);
	const [myState] = useIoBrokerState({
		id: 'elgato-key-light.0.info.connections',
	});
	const [devices, setDevices] = React.useState<KeyLight[]>([]);
	const [interval, setInterval] = React.useState(60);
	const [changed, setChanged] = useState(false);

	// call all devices
	useEffect(() => {
		if (myState) {
			let data: KeyLight[] = [];
			if (typeof myState === 'string') {
				data = JSON.parse(myState);
			}
			console.log('all devices', data);
			setDevices(data);
		}
	}, [myState]);

	// call native settings
	useEffect(() => {
		if (myObject) {
			console.log(`Interval was set to`, myObject.native.interval);
			setInterval(myObject.native.interval);
		} else {
			console.log(`system.adapter.${namespace} is undefined`);
		}
	}, [myObject]);

	const updateInterval = (value: number) => {
		// check if the value has changed
		if (myObject) {
			if (value !== myObject.native.interval) {
				// set the new value
				console.log('interval changed to', value);
				setChanged(true);
			} else {
				console.log('interval has not changed');
				setChanged(false);
			}
			setInterval(value);
		} else {
			console.log(`system.adapter.${namespace} is undefined`);
		}
	};

	const handleSaveInterval = async () => {
		console.log('save interval', interval);
		// save the value to the myObject.native.interval
		await extendMyObject({
			...myObject,
			native: {
				interval: interval,
			},
		});
		setChanged(false);
	};

	return (
		<React.Fragment>
			<Stack spacing={2}>
				<Logo
					classes={{
						logo: 'logo',
						buttons: 'buttons',
					}}
				/>
			</Stack>
			<Spacer
				variant={'h4'}
				text={t('tab_interval')}
				sx={{
					backgroundColor: 'none',
				}}
			/>
			<Grid
				container
				spacing={0}
				sx={{ marginTop: '10px', display: 'flex', justifyContent: 'center', flexWrap: 'nowrap' }}
			>
				<React.Fragment>
					<Box
						sx={{
							width: '150px',
						}}
					>
						<NumberInput
							label={t('tab_interval')}
							aria-label={t('tab_interval')}
							defaultValue={60}
							min={10}
							max={999}
							textAlign={'center'}
							unit={'s'}
							onChange={updateInterval}
							value={interval}
							tooltip={{
								title: t('tab_intervalTooltip'),
								placement: 'top',
								arrow: true,
							}}
						/>
					</Box>
					<SaveButton onClick={handleSaveInterval} changed={changed} lable={t('tab_saveButton')} />
				</React.Fragment>
			</Grid>
			<Spacer
				variant={'h4'}
				text={t('tab_devices')}
				sx={{
					backgroundColor: 'none',
					marginTop: '10px',
					marginBottom: '20px',
				}}
			/>
			<Grid container spacing={0} sx={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
				<React.Fragment>
					{alive ? (
						devices && devices.length > 0 ? (
							devices.map((item, index) => (
								<BoxCard key={`${item.name}${index}`} item={item} index={index} />
							))
						) : (
							<Typography variant="h6" sx={{ textAlign: 'center', color: orange[600] }}>
								{t('tab_noDevices')}
							</Typography>
						)
					) : (
						<Grid item xs={12} sx={{ textAlign: 'center' }}>
							<Typography variant="h6" sx={{ textAlign: 'center', color: red[600] }}>
								{t('tab_adapterNotAlive')}
							</Typography>
						</Grid>
					)}
				</React.Fragment>
			</Grid>
		</React.Fragment>
	);
};

ReactDOM.render(
	<IoBrokerApp name={'elgato-key-light'} translations={translations}>
		<Root />
	</IoBrokerApp>,
	document.getElementById('root'),
);
