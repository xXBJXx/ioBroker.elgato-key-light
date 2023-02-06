import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import type { Translations } from 'iobroker-react/i18n';
import { IoBrokerApp } from 'iobroker-react/app';
import {
	useAdapter,
	useConnection,
	useGlobals,
	useI18n,
	useIoBrokerObject,
	useIoBrokerState,
} from 'iobroker-react/hooks';
import { IpAddressInput, NumberInput, SettingsHeader } from 'iobroker-react';
import { Alert, Box, Button, Grid, Stack, Typography, useTheme } from '@mui/material';
import { KeyLight } from '../../src/types/KeyLight';
import { BoxCard } from './components/BoxCard';
import { orange, red } from '@mui/material/colors';
import { SaveButton } from './components/SaveButton';
import { Spacer } from './components/Spacer';
// import { AddDeviceModal } from './modal/AddDeviceModal';
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
	const theme = useTheme();
	const { translate: t } = useI18n();
	const { alive } = useAdapter();
	const connection = useConnection();
	const { namespace } = useGlobals();
	const [ipAddress, setIpAddress] = React.useState('');
	const [ipValid, setIpValid] = React.useState(false);

	const [myObject, extendMyObject] = useIoBrokerObject(`system.adapter.${namespace}`);
	const [myState] = useIoBrokerState({
		id: 'elgato-key-light.0.info.connections',
	});
	const [devices, setDevices] = React.useState<KeyLight[]>([]);
	const [interval, setInterval] = React.useState(60);
	const [changed, setChanged] = useState(false);
	const [error, setError] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

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

	useEffect(() => {
		if (error) {
			setTimeout(() => {
				setError(false);
				setErrorMessage('');
			}, 5000);
		}
	}, [error]);

	const addDevice = React.useCallback(
		async (ip: string, valid: boolean) => {
			if (!valid) return console.error('Invalid IP Address');
			const data = {
				ip,
			};
			const result = await connection.sendTo(namespace, 'addKeyLight', data);
			if (!result) console.error('Nope!');
			if (result.error) {
				console.error(result.error);
				console.error(result.message);
				setError(true);
				setErrorMessage(result.message.message);
				return;
			} else {
				console.info(result);
				setIpAddress('');
			}
		},
		[connection, namespace],
	);

	return (
		<React.Fragment>
			<Stack
				spacing={2}
				sx={{
					position: 'fixed',
					top: 0,
					left: 0,
					width: '100%',
					zIndex: 100,
					boxShadow: '0 0 10px 0 rgba(0,0,0,0.2)',
					display: 'flex',
					flexDirection: 'row',
					justifyContent: 'space-between',
					alignItems: 'flex-start',
					flexWrap: 'wrap',
					backgroundColor: theme.palette.background.paper,
				}}
			>
				<SettingsHeader
					classes={{
						logo: 'logo',
						buttons: 'buttons',
					}}
				/>
			</Stack>
			<Box
				id="box_config"
				sx={{
					position: 'fixed',
					top: '90px',
					left: 0,
					width: '100%',
					zIndex: 100,
					backgroundColor: theme.palette.background.paper,
					display: 'flex',
					flexDirection: 'row',
					justifyContent: 'center',
					alignItems: 'center',
					flexWrap: 'wrap',
				}}
			>
				<Box
					id="box_interval"
					sx={{
						height: '130px',
						marginBottom: '10px',
					}}
				>
					<Spacer
						id="spacer_interval"
						variant={'h4'}
						text={t('tab_interval')}
						sx={{
							marginTop: '10px',
							marginBottom: '20px',
							backgroundColor: 'none',
						}}
					/>
					<Grid
						id="grid_interval"
						container
						spacing={0}
						sx={{
							marginTop: '10px',
							display: 'flex',
							justifyContent: 'center',
							flexWrap: 'nowrap',
						}}
					>
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
					</Grid>
				</Box>
				<Box
					id={'box_addDevices'}
					sx={{
						height: '130px',
						marginBottom: '10px',
					}}
				>
					<Spacer
						id={'spacer_addDevices'}
						variant={'h4'}
						text={t('tab_addDevices')}
						sx={{
							backgroundColor: 'none',
							marginTop: '10px',
							marginBottom: '20px',
						}}
					/>
					<Grid
						id={'grid_addDevices'}
						container
						spacing={0}
						sx={{
							marginTop: '15px',
							marginBottom: '30px',
							display: 'flex',
							justifyContent: 'center',
							flexWrap: 'nowrap',
						}}
					>
						<Box
							sx={{
								width: '150px',
							}}
						>
							<IpAddressInput
								required={true}
								error={true}
								textAlign={'center'}
								label={'IP Address'}
								value={ipAddress}
								color={'success'}
								margin={'normal'}
								onChange={(value, valid) => {
									setIpAddress(value);
									console.log('valid', value, valid);
									if (valid !== undefined) {
										setIpValid(valid);
									}
								}}
							/>
						</Box>
						<Box
							component="div"
							sx={{
								display: 'flex',
								flexFlow: 'row nowrap',
								justifyItems: 'space-between',
								justifyContent: 'center',
								gap: theme.spacing(1),
								padding: theme.spacing(1, 2.25),
							}}
						>
							<Button
								variant="contained"
								color="primary"
								disabled={!ipValid || !alive}
								onClick={async () => {
									await addDevice(ipAddress, ipValid);
								}}
							>
								{t('tab_addDevices')}
							</Button>
						</Box>
					</Grid>
				</Box>
			</Box>
			<Spacer
				id={'spacer_devices'}
				variant={'h4'}
				text={t('tab_devices')}
				sx={{
					position: 'fixed',
					width: '100%',
					top: '226px',
					zIndex: 100,
					marginBottom: '20px',
					backgroundColor: theme.palette.background.paper,
					display: 'flex',
					flexDirection: 'row',
					justifyContent: 'center',
					alignItems: 'center',
					flexWrap: 'wrap',
				}}
			/>
			{error ? (
				<Box
					id={'box_devicesAlert'}
					sx={{
						position: 'fixed',
						width: '100%',
						top: '265px',
						zIndex: 100,
					}}
				>
					<Alert
						variant="filled"
						sx={{
							display: 'flex',
							flexDirection: 'row',
							justifyContent: 'center',
							alignItems: 'center',
						}}
						severity="error"
					>
						{errorMessage}
					</Alert>
				</Box>
			) : null}

			<Box
				id={'box_devices'}
				sx={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
					gridGap: '10px',
					justifyItems: 'center',
					alignItems: 'center',
					justifyContent: 'center',
					alignContent: 'center',
					paddingTop: '320px',
				}}
			>
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
			</Box>
		</React.Fragment>
	);
};

ReactDOM.render(
	<IoBrokerApp name={'elgato-key-light'} translations={translations}>
		<Root />
	</IoBrokerApp>,
	document.getElementById('root'),
);
