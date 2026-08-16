import React from 'react';
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/Bolt';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import LinkIcon from '@mui/icons-material/Link';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    FormControlLabel,
    Grid,
    IconButton,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import {
    GenericApp,
    I18n,
    Loader,
    type AdminConnection,
    type GenericAppProps,
    type GenericAppSettings,
    type GenericAppState,
} from '@iobroker/gui-components';

import { translations } from './translations';

interface DeviceConfig {
    host: string;
    port: number;
    serialNumber?: string;
    displayName?: string;
    source: 'manual' | 'discovery' | 'legacy';
    enabled: boolean;
}

interface NativeConfig extends Record<string, unknown> {
    interval?: number;
    requestTimeoutMs?: number;
    maxBackoffSeconds?: number;
    writeDebounceMs?: number;
    discoveryTimeoutMs?: number;
    discoveryInterface?: string;
    discoveryEnabled?: boolean;
    devices?: DeviceConfig[];
}

interface DiscoveredDevice {
    name: string;
    hostname?: string;
    addresses: string[];
    port: number;
}

interface Reply<T> { success: boolean; result?: T; message?: string }
interface AppState extends GenericAppState { discovering: boolean; discovered: DiscoveredDevice[] }

const t = (text: string): string => I18n.t(text);

export default class App extends GenericApp<GenericAppProps, AppState> {
    public constructor(props: GenericAppProps) {
        const settings: GenericAppSettings = {
            ...props,
            socket: { port: Number(window.location.port) === 3000 ? 8081 : Number(window.location.port) },
            translations,
        };
        super(props, settings);
        this.state = { ...this.state, discovering: false, discovered: [] };
    }

    private discover = async (): Promise<void> => {
        this.setState({ discovering: true });
        try {
            const response = await this.socket.sendTo<Reply<DiscoveredDevice[]>>(this.instanceId, 'discover', {});
            if (!response.success) throw new Error(response.message || t('Discovery failed'));
            this.setState({ discovered: response.result ?? [] });
        } catch (error) {
            this.showError(error instanceof Error ? error.message : String(error));
        } finally {
            this.setState({ discovering: false });
        }
    };

    private removeDevice = async (device: DeviceConfig, devices: DeviceConfig[]): Promise<void> => {
        this.updateNativeValue('devices', devices);
        try {
            const response = await this.socket.sendTo<Reply<{ removed: boolean }>>(this.instanceId, 'removeDevice', {
                ...(device.serialNumber ? { id: device.serialNumber } : {}),
                host: device.host,
                port: device.port,
            });
            if (!response.success) throw new Error(response.message || t('Could not remove device'));
        } catch (error) {
            this.showError(
                `${error instanceof Error ? error.message : String(error)} ${t('Save the configuration to apply the removal.')}`,
            );
        }
    };

    public render(): React.JSX.Element {
        if (!this.state.loaded) {
            return <StyledEngineProvider injectFirst><ThemeProvider theme={this.state.theme}><Loader themeType={this.state.themeType} /></ThemeProvider></StyledEngineProvider>;
        }
        return (
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={this.state.theme}>
                    <Box className="app-shell" sx={{ bgcolor: 'background.default', color: 'text.primary' }}>
                        <ConfigPanel
                            native={this.state.native as NativeConfig}
                            socket={this.socket}
                            instanceId={this.instanceId}
                            discovering={this.state.discovering}
                            discovered={this.state.discovered}
                            onDiscover={this.discover}
                            onRemoveDevice={this.removeDevice}
                            onSuccess={message => this.showToast(message)}
                            onChange={(key, value) => this.updateNativeValue(key, value)}
                            onError={message => this.showError(message)}
                        />
                        {this.renderHelperDialogs()}
                    </Box>
                </ThemeProvider>
            </StyledEngineProvider>
        );
    }
}

interface PanelProps {
    native: NativeConfig;
    socket: AdminConnection;
    instanceId: string;
    discovering: boolean;
    discovered: DiscoveredDevice[];
    onDiscover(): void;
    onRemoveDevice(device: DeviceConfig, devices: DeviceConfig[]): Promise<void>;
    onSuccess(message: string): void;
    onChange(key: string, value: unknown): void;
    onError(message: string): void;
}

function ConfigPanel(props: PanelProps): React.JSX.Element {
    const [host, setHost] = React.useState('');
    const [port, setPort] = React.useState(9123);
    const [testing, setTesting] = React.useState(false);
    const [activeAction, setActiveAction] = React.useState('');
    const devices = props.native.devices ?? [];

    const add = (candidate: DeviceConfig): void => {
        if (devices.some(device => device.host === candidate.host && device.port === candidate.port)) return;
        props.onChange('devices', [...devices, candidate]);
    };

    const test = async (): Promise<void> => {
        setTesting(true);
        try {
            const response = await props.socket.sendTo<Reply<unknown>>(props.instanceId, 'testDevice', { host, port });
            if (!response.success) throw new Error(response.message || t('Connection test failed'));
        } catch (error) {
            props.onError(error instanceof Error ? error.message : String(error));
        } finally {
            setTesting(false);
        }
    };

    const runDeviceAction = async (command: string, device: DeviceConfig): Promise<void> => {
        const key = `${command}:${device.serialNumber ?? `${device.host}:${device.port}`}`;
        setActiveAction(key);
        try {
            const payload = {
                ...(device.serialNumber ? { id: device.serialNumber } : {}),
                host: device.host,
                port: device.port,
            };
            const response = await props.socket.sendTo<Reply<unknown>>(props.instanceId, command, payload);
            if (!response.success) throw new Error(response.message || `${command} failed`);
            props.onSuccess(t(command === 'testDevice' ? 'Test successful' : 'Action completed'));
        } catch (error) {
            props.onError(error instanceof Error ? error.message : String(error));
        } finally {
            setActiveAction('');
        }
    };

    return (
        <Stack spacing={3} className="content">
            <Box><Typography variant="h4">Elgato Key Light</Typography><Typography color="text.secondary">{t('Local control, capability detection and resilient polling')}</Typography></Box>
            <Card variant="outlined"><CardContent><Typography variant="h6" gutterBottom>{t('Runtime')}</Typography><Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth label={t('Polling (seconds)')} type="number" value={props.native.interval ?? 60} onChange={event => props.onChange('interval', Number(event.target.value))} slotProps={{ htmlInput: { min: 5, max: 3600 } }} /></Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth label={t('Request timeout (ms)')} type="number" value={props.native.requestTimeoutMs ?? 3000} onChange={event => props.onChange('requestTimeoutMs', Number(event.target.value))} /></Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth label={t('Maximum backoff (s)')} type="number" value={props.native.maxBackoffSeconds ?? 300} onChange={event => props.onChange('maxBackoffSeconds', Number(event.target.value))} /></Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth label={t('Write debounce (ms)')} type="number" value={props.native.writeDebounceMs ?? 200} onChange={event => props.onChange('writeDebounceMs', Number(event.target.value))} /></Grid>
            </Grid></CardContent></Card>

            <Card variant="outlined"><CardContent><Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', gap: 1 }}><Box><Typography variant="h6">{t('Discovery')}</Typography><Typography color="text.secondary">Bonjour/mDNS service _elg._tcp.local.</Typography></Box><Button startIcon={props.discovering ? <RefreshIcon /> : <SearchIcon />} disabled={props.discovering} onClick={props.onDiscover}>{props.discovering ? `${t('Searching')}…` : t('Scan network')}</Button></Stack>
                <FormControlLabel control={<Switch checked={props.native.discoveryEnabled ?? true} onChange={event => props.onChange('discoveryEnabled', event.target.checked)} />} label={t('Enable discovery')} />
                <TextField label={t('Discovery timeout (ms)')} type="number" value={props.native.discoveryTimeoutMs ?? 5000} onChange={event => props.onChange('discoveryTimeoutMs', Number(event.target.value))} />
                <TextField label={t('Network interface (optional)')} helperText={t('Local interface IP used for mDNS; leave empty to use all interfaces.')} value={props.native.discoveryInterface ?? ''} onChange={event => props.onChange('discoveryInterface', event.target.value)} />
                {props.discovered.length === 0 ? <Alert severity="info">{t('No scan results yet. Manual setup remains available.')}</Alert> : props.discovered.map(device => {
                    const address = device.addresses[0] ?? device.hostname;
                    return <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }} key={`${device.name}-${device.port}`}><Box sx={{ flex: 1 }}><Typography>{device.name}</Typography><Typography variant="body2" color="text.secondary">{address}:{device.port}</Typography></Box><Button disabled={!address} startIcon={<AddIcon />} onClick={() => address && add({ host: address, port: device.port, displayName: device.name, source: 'discovery', enabled: true })}>{t('Add')}</Button></Stack>;
                })}
            </Stack></CardContent></Card>

            <Card variant="outlined"><CardContent><Stack spacing={2}>
                <Typography variant="h6">{t('Manual device')}</Typography><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField fullWidth label={t('Private IP or local hostname')} value={host} onChange={event => setHost(event.target.value)} /><TextField label={t('Port')} type="number" value={port} onChange={event => setPort(Number(event.target.value))} /><Button disabled={!host || testing} onClick={test}>{t('Test')}</Button><Button variant="contained" disabled={!host} startIcon={<AddIcon />} onClick={() => add({ host, port, source: 'manual', enabled: true })}>{t('Add')}</Button></Stack>
            </Stack></CardContent></Card>

            <Card variant="outlined"><CardContent><Typography variant="h6" gutterBottom>{t('Configured devices')}</Typography><Stack spacing={1}>{devices.length === 0 ? <Alert severity="warning">{t('No device configured.')}</Alert> : devices.map((device, index) => {
                const busy = activeAction.endsWith(device.serialNumber ?? `${device.host}:${device.port}`);
                return <Stack className="device-row" direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, gap: 1 }} key={`${device.host}:${device.port}`}><Box sx={{ flex: 1 }}><Typography>{device.displayName || device.host}</Typography><Stack direction="row" spacing={1}><Chip size="small" label={t(device.source)} /><Typography variant="body2" color="text.secondary">{device.host}:{device.port}</Typography></Stack></Box><Stack direction="row" className="device-actions">
                    <Tooltip title={t('Test')}><span><IconButton disabled={busy} aria-label={`${t('Test')} ${device.displayName || device.host}`} onClick={() => void runDeviceAction('testDevice', device)}><LinkIcon /></IconButton></span></Tooltip>
                    <Tooltip title={t('Refresh')}><span><IconButton disabled={busy} aria-label={`${t('Refresh')} ${device.displayName || device.host}`} onClick={() => void runDeviceAction('refreshDevice', device)}><RefreshIcon /></IconButton></span></Tooltip>
                    <Tooltip title={t('Reconnect')}><span><IconButton disabled={busy} aria-label={`${t('Reconnect')} ${device.displayName || device.host}`} onClick={() => void runDeviceAction('reconnectDevice', device)}><LinkIcon /></IconButton></span></Tooltip>
                    <Tooltip title={t('Identify')}><span><IconButton disabled={busy} aria-label={`${t('Identify')} ${device.displayName || device.host}`} onClick={() => void runDeviceAction('identifyDevice', device)}><BoltIcon /></IconButton></span></Tooltip>
                </Stack><FormControlLabel control={<Switch checked={device.enabled} slotProps={{ input: { 'aria-label': `${t('Enabled')} ${device.displayName || device.host}` } }} onChange={event => props.onChange(`devices.${index}.enabled`, event.target.checked)} />} label={t('Enabled')} /><Tooltip title={t('Remove')}><IconButton aria-label={`${t('Remove')} ${device.displayName || device.host}`} onClick={() => void props.onRemoveDevice(device, devices.filter((_, itemIndex) => itemIndex !== index))}><DeleteOutlineIcon /></IconButton></Tooltip></Stack>;
            })}</Stack></CardContent></Card>
        </Stack>
    );
}
