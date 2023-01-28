/**
 * Created by alex-issi on 10.12.22
 */
import {
	Box,
	Button,
	Card,
	CardActions,
	CardContent,
	CardHeader,
	CardMedia,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Grid,
	IconButton,
	Menu,
	Paper,
	TextField,
	Typography,
} from '@mui/material';
import { useConnection, useGlobals, useI18n, useIoBrokerState, useIoBrokerTheme } from 'iobroker-react/hooks';
import React, { useEffect, useState } from 'react';
import { KeyLight } from '../../../src/types/KeyLight';
import { BrightnessSlider } from './BrightnessSlider';
import { ColorTemperatureSlider } from './ColorTemperatureSlider';
import { UpdateButton } from './UpdateButton';
import { SketchPicker } from 'react-color';
import { Close as IconClose, Delete as DeleteIcon, PowerSettingsNew as IconPower } from '@mui/icons-material';

export interface TabletCardProps {
	item: KeyLight;
	index: number;
}

export const BoxCard: React.FC<TabletCardProps> = ({ item }): JSX.Element => {
	const { translate: t } = useI18n();
	const [themeName] = useIoBrokerTheme();
	const connection = useConnection();
	const { namespace } = useGlobals();
	const [myColorTemp, myColorTempAck, setMyColorTemp] = useIoBrokerState({
		id: `${namespace}.${item.info?.serialNumber}.light.lights.0.temperature`,
	});
	const [myBrightness, myBrightnessAck, setMyBrightness] = useIoBrokerState({
		id: `${namespace}.${item.info?.serialNumber}.light.lights.0.brightness`,
	});
	const [myOn, myOnAck, setMyOn] = useIoBrokerState({
		id: `${namespace}.${item.info?.serialNumber}.light.lights.0.on`,
	});
	const [myRGB, myRGBAck, setMyRGB] = useIoBrokerState({
		id: `${namespace}.${item.info?.serialNumber}.light.lights.0.rgb`,
	});
	const [myName, myNameAck] = useIoBrokerState({
		id: `${namespace}.${item.info?.serialNumber}.info.displayName`,
	});
	const [openDialog, setOpenDialog] = React.useState(false);
	const [colorTemp, setColorTemp] = useState<number>(2900);
	const [brightness, setBrightness] = useState<number>(10);
	const [color, setColor] = useState<any>({});
	const [rgb, setRGB] = useState<string>('0, 0, 0');
	const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
	const open = Boolean(anchorEl);
	const [onOff, setOnOff] = useState<boolean>(false);
	const [name, setName] = useState<string>('');

	// Name change
	useEffect(() => {
		if (myName && myNameAck) {
			setName(myName as string);
		}
	}, [myName]);

	// Color Temperature
	useEffect(() => {
		if (myColorTemp && myColorTempAck) {
			// console.log('ColorTemp set to', myColorTemp);
			setColorTemp(myColorTemp as number);
		}
	}, [myColorTemp]);

	// Brightness
	useEffect(() => {
		if (myBrightness && myBrightnessAck) {
			// console.log('Brightness set to ', myBrightness);
			setBrightness(myBrightness as number);
		}
	}, [myBrightness]);

	//rgb
	useEffect(() => {
		if (myRGB && myRGBAck) {
			// console.log('RGB set to ', myRGB);
			let rgbArray: string[] = [];
			if (typeof myRGB === 'string') {
				rgbArray = myRGB.split(',');
			}
			setRGB(myRGB.toString());
			const rgbConfig = {
				r: rgbArray[0],
				g: rgbArray[1],
				b: rgbArray[2],
			};
			setColor(rgbConfig);
		}
	}, [myRGB]);

	//onOff
	useEffect(() => {
		if (myOn && myOnAck) {
			// console.log('OnOff set to ', myOn);
			setOnOff(myOn as boolean);
		}
	}, [myOn]);

	const handleColorTemperature = (value: number) => {
		setColorTemp(value);
	};

	const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		setAnchorEl(event.currentTarget);
	};
	const handleClose = () => {
		setAnchorEl(null);
	};

	const handleColorComplete = (color) => {
		console.log('Color complete', color);
		const rgb = `${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}`;
		setRGB(rgb);
		setColor(color);
	};

	const handleBrightness = (value: number) => {
		setBrightness(value);
	};

	const handleOnOff = async () => {
		if (onOff) {
			console.log('Turning off');
			setOnOff(false);
			await setMyOn(false);
		} else {
			setOnOff(true);
			console.log('Turning on');
			await setMyOn(true);
		}
	};

	const updateState = async () => {
		if (item.info?.productName === 'Elgato Light Strip') {
			if (myRGB !== rgb) {
				await setMyRGB(rgb);
			}
			if (myBrightness !== brightness) {
				await setMyBrightness(brightness);
			}
			console.log('Updating Light Strip');
		} else {
			console.log('Updating Key Light');
			// check if the states have changed
			if (myColorTemp !== colorTemp) {
				// console.log('Update ColorTemp');
				await setMyColorTemp(colorTemp);
			}
			if (myBrightness !== brightness) {
				// console.log('Update Brightness');
				await setMyBrightness(brightness);
			}
		}
	};

	const handleBackgroundColor = () => {
		if (themeName === 'dark') {
			return {
				color: '#f0f0f0',
				cardAction: '#211f1f',
				cardControl: '#9f9f9f',
				gradientStart: '#5D5B5BFF',
				gradientEnd: '#2F2D2DFF',
			};
		} else if (themeName === 'blue') {
			return {
				color: '#f0f0f0',
				cardAction: '#1a2426',
				cardControl: '#2f3d42',
				gradientStart: '#415157',
				gradientEnd: '#1e262a',
			};
		} else {
			return {
				color: '#303030',
				cardAction: '#5d5b5b',
				cardControl: '#868484',
				gradientStart: '#cbcbcb',
				gradientEnd: '#726b6b',
			};
		}
	};

	const handleClickOpen = () => {
		setOpenDialog(true);
	};

	const handleCloseDialog = () => {
		setOpenDialog(false);
	};

	const deleteKeyLight = React.useCallback(
		async (id: string | undefined) => {
			if (id === undefined) return;
			const data = {
				id,
			};
			const result = await connection.sendTo(namespace, 'deleteKeyLight', data);
			if (!result) console.error('delete failed!');
			if (result.message === 'success') {
				console.log('delete Success');
				setOpenDialog(false);
			}
		},
		[connection, namespace],
	);

	// const handleDelete = async (id) => {
	// 	console.log('Delete');
	// 	console.log(id);
	//
	// 	await deleteKeyLight(id);
	// };

	return (
		<Card
			sx={{
				margin: '10px',
				padding: '10px',
				width: '351px',
				height: '600px',
				maxWidth: '351px',
				maxHeight: '600px',
				borderRadius: '20px',
				boxShadow: '0px 0px 10px 0px rgba(0,0,0,0.75)',
				color: handleBackgroundColor().color,
				backgroundImage: `linear-gradient(to right, ${handleBackgroundColor().gradientStart}, ${
					handleBackgroundColor().gradientEnd
				})`,
			}}
		>
			<CardHeader
				sx={{
					margin: '5 5 0 5',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					borderRadius: '15px 15px 0px 0px',
					borderTop: '2.5px solid',
					borderRight: '2.5px solid',
					borderLeft: '2.5px solid',
					borderColor: 'black',
					paddingTop: '2px',
					paddingBottom: '0px',
					'	.MuiCardHeader-content': {
						display: 'flex',
						alignItems: 'center',
						flexWrap: 'wrap',
						justifyContent: 'center',
						fontSize: '1.3rem',
					},
				}}
				title={name ? name : item.info?.productName || item.name}
			/>
			<CardMedia
				component="img"
				image={`media/${item.info?.productName?.replace(/\s/g, '-').toLowerCase()}.png`}
				alt={item.info?.productName?.replace(/\s/g, '-').toLowerCase()}
				sx={{
					margin: '0 5 0 5',
					width: '321px',
					height: '200px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					borderRight: '2.5px solid',
					borderLeft: '2.5px solid',
					borderColor: 'black',
					paddingTop: '2px',
					paddingBottom: '0px',
				}}
			/>

			<CardContent
				sx={{
					paddingTop: '40px',
					paddingBottom: '20px',
					height: '20px',
					maxHeight: '20px',
					margin: '0 5 0 5',
					borderRight: '2.5px solid',
					borderLeft: '2.5px solid',
					borderColor: 'black',
					display: 'flex',
					justifyContent: 'space-evenly',
					alignItems: 'center',
					flexWrap: 'wrap',
					alignContent: 'center',
					fontSize: '1.2rem',
				}}
			>
				{`IP: ${item.ip}`}
				<IconButton aria-label="delete" onClick={handleClickOpen}>
					<DeleteIcon />
				</IconButton>
				<Dialog open={openDialog} onClose={handleCloseDialog}>
					<DialogTitle id="dialog_DeleteText">{'dialog_Delete'}</DialogTitle>
					<DialogContent>
						<DialogContentText id="dialog_DeleteText">
							{t(
								'boxCard_dialog_DeleteText',
								item.info?.displayName || (item.info?.serialNumber as string),
							)}
						</DialogContentText>
					</DialogContent>
					<DialogActions>
						<Button onClick={handleCloseDialog}>{t('boxCard_cancel')}</Button>
						<Button onClick={() => deleteKeyLight(item.info?.serialNumber)} autoFocus>
							{t('boxCard_delete')}
						</Button>
					</DialogActions>
				</Dialog>
			</CardContent>
			<CardActions
				disableSpacing
				sx={{
					display: 'flex',
					justifyContent: 'space-around',
					margin: '0 5 0 5',
					height: '280px',
					borderRadius: '0px 0px 15px 15px',
					borderRight: '2.5px solid',
					borderLeft: '2.5px solid',
					borderBottom: '2.5px solid',
					borderColor: 'black',
				}}
			>
				<React.Fragment>
					<Grid
						container
						sx={{
							width: '100%',
							display: 'flex',
							justifyContent: 'space-around',
						}}
					>
						<Box
							sx={{
								width: '100%',
								margin: '0 10 10 10',
							}}
						>
							{item.info?.productName === 'Elgato Light Strip' ? (
								<Box
									sx={{
										display: 'flex',
										justifyContent: 'center',
										flexWrap: 'wrap',
										flexDirection: 'column',
										alignItems: 'center',
										// width: '145px',
										'& .ColorPicker-MuiInputBase-root': {
											color: handleBackgroundColor().color,
											width: '170px',
										},
										'& .ColorPicker-MuiInputBase-input': {
											textAlign: 'center',
										},
									}}
								>
									<Typography variant={'h6'}>{t('boxCard_Color')}</Typography>
									<Box
										sx={{
											display: 'flex',
											flexWrap: 'nowrap',
											alignItems: 'center',
											flexDirection: 'row',
										}}
									>
										<Paper
											component="button"
											onClick={handleClick}
											elevation={6}
											sx={{
												width: '60px',
												height: '40px',
												backgroundColor: `rgb(${rgb})`,
												marginRight: '10px',
											}}
										/>
										<TextField
											value={`rgb(${rgb})`}
											disabled
											sx={{
												width: '165px',
												'& .MuiInputBase-input': {
													textAlign: 'center',
												},
											}}
										/>
									</Box>
									<Menu
										anchorEl={anchorEl}
										open={open}
										onClose={handleClose}
										sx={{
											// backgroundColor: 'black',
											textAlign: 'center',
											padding: '0px',
										}}
									>
										<SketchPicker
											color={color}
											onChange={handleColorComplete}
											onChangeComplete={(color) => handleColorComplete(color)}
										/>
										<IconButton
											onClick={handleClose}
											sx={{
												backgroundColor: `theme.palette.background.paper !important`,
												borderRadius: '0 0 25% 25%',
												'&:hover': {
													backgroundColor: `theme.palette.secondary.main !important`,
												},
											}}
										>
											<IconClose />
										</IconButton>
									</Menu>
								</Box>
							) : (
								<Box
									sx={{
										display: 'flex',
										justifyContent: 'center',
										flexWrap: 'wrap',
										flexDirection: 'column',
										alignItems: 'center',
									}}
								>
									<Typography variant={'h6'}>{t('boxCard_ColorTemp')}</Typography>
									<ColorTemperatureSlider onChange={handleColorTemperature} value={colorTemp} />
								</Box>
							)}
						</Box>
						<Box
							sx={{
								width: '100%',
								margin: `${item.info?.productName === 'Elgato Light Strip' ? 0 : 5} 10 ${
									item.info?.productName === 'Elgato Light' + ' Strip' ? 5 : 30
								} 10`,
								display: 'flex',
								justifyContent: 'center',
								flexWrap: 'wrap',
								flexDirection: 'column',
								alignItems: 'center',
							}}
						>
							<Typography variant={'h6'}>{t('boxCard_Brightness')}</Typography>
							<BrightnessSlider onChange={handleBrightness} value={brightness} />
						</Box>

						<Button
							variant="contained"
							size="medium"
							sx={{
								fontWeight: 'bold',
								bgcolor: myOn ? '#218526' : '#832525',
								'&:hover': {
									bgcolor: myOn ? '#155418' : '#571818',
								},
							}}
							onClick={handleOnOff}
						>
							{myOn ? (
								<IconPower
									sx={{
										color: '#00ff00',
									}}
								/>
							) : (
								<IconPower
									sx={{
										color: 'red',
									}}
								/>
							)}
						</Button>
						<Grid item xs={12}>
							<UpdateButton onClick={updateState} lable={t('boxCard_update')} />
						</Grid>
					</Grid>
				</React.Fragment>
			</CardActions>
		</Card>
	);
};
