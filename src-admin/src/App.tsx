import React from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
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
    Typography,
} from '@mui/material';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import {
    GenericApp,
    Loader,
    type AdminConnection,
    type GenericAppProps,
    type GenericAppSettings,
    type GenericAppState,
} from '@iobroker/gui-components';

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
    discoveryEnabled?: boolean;
    autoAddDiscovered?: boolean;
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

export default class App extends GenericApp<GenericAppProps, AppState> {
    public constructor(props: GenericAppProps) {
        const settings: GenericAppSettings = {
            ...props,
            socket: { port: Number(window.location.port) === 3000 ? 8081 : Number(window.location.port) },
        };
        super(props, settings);
        this.state = { ...this.state, discovering: false, discovered: [] };
    }

    private discover = async (): Promise<void> => {
        this.setState({ discovering: true });
        try {
            const response = await this.socket.sendTo<Reply<DiscoveredDevice[]>>(this.instanceId, 'discover', {});
            if (!response.success) throw new Error(response.message || 'Discovery failed');
            this.setState({ discovered: response.result ?? [] });
        } catch (error) {
            this.showError(error instanceof Error ? error.message : String(error));
        } finally {
            this.setState({ discovering: false });
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
    onChange(key: string, value: unknown): void;
    onError(message: string): void;
}

function ConfigPanel(props: PanelProps): React.JSX.Element {
    const [host, setHost] = React.useState('');
    const [port, setPort] = React.useState(9123);
    const [testing, setTesting] = React.useState(false);
    const devices = props.native.devices ?? [];

    const add = (candidate: DeviceConfig): void => {
        if (devices.some(device => device.host === candidate.host && device.port === candidate.port)) return;
        props.onChange('devices', [...devices, candidate]);
    };

    const test = async (): Promise<void> => {
        setTesting(true);
        try {
            const response = await props.socket.sendTo<Reply<unknown>>(props.instanceId, 'testDevice', { host, port });
            if (!response.success) throw new Error(response.message || 'Connection test failed');
        } catch (error) {
            props.onError(error instanceof Error ? error.message : String(error));
        } finally {
            setTesting(false);
        }
    };

    return (
        <Stack spacing={3} className="content">
            <Box><Typography variant="h4">Elgato Key Light</Typography><Typography color="text.secondary">Local control, capability detection and resilient polling</Typography></Box>
            <Card variant="outlined"><CardContent><Typography variant="h6" gutterBottom>Runtime</Typography><Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth label="Polling (seconds)" type="number" value={props.native.interval ?? 60} onChange={event => props.onChange('interval', Number(event.target.value))} slotProps={{ htmlInput: { min: 5, max: 3600 } }} /></Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth label="Request timeout (ms)" type="number" value={props.native.requestTimeoutMs ?? 3000} onChange={event => props.onChange('requestTimeoutMs', Number(event.target.value))} /></Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth label="Maximum backoff (s)" type="number" value={props.native.maxBackoffSeconds ?? 300} onChange={event => props.onChange('maxBackoffSeconds', Number(event.target.value))} /></Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField fullWidth label="Write debounce (ms)" type="number" value={props.native.writeDebounceMs ?? 200} onChange={event => props.onChange('writeDebounceMs', Number(event.target.value))} /></Grid>
            </Grid></CardContent></Card>

            <Card variant="outlined"><CardContent><Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', gap: 1 }}><Box><Typography variant="h6">Discovery</Typography><Typography color="text.secondary">Bonjour/mDNS service _elg._tcp.local.</Typography></Box><Button startIcon={props.discovering ? <RefreshIcon /> : <SearchIcon />} disabled={props.discovering} onClick={props.onDiscover}>{props.discovering ? 'Searching…' : 'Scan network'}</Button></Stack>
                <FormControlLabel control={<Switch checked={props.native.discoveryEnabled ?? true} onChange={event => props.onChange('discoveryEnabled', event.target.checked)} />} label="Enable discovery" />
                <FormControlLabel control={<Switch checked={props.native.autoAddDiscovered ?? false} onChange={event => props.onChange('autoAddDiscovered', event.target.checked)} />} label="Automatically add devices found when the adapter starts" />
                <TextField label="Discovery timeout (ms)" type="number" value={props.native.discoveryTimeoutMs ?? 5000} onChange={event => props.onChange('discoveryTimeoutMs', Number(event.target.value))} />
                {props.discovered.length === 0 ? <Alert severity="info">No scan results yet. Manual setup remains available.</Alert> : props.discovered.map(device => {
                    const address = device.addresses[0] ?? device.hostname;
                    return <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }} key={`${device.name}-${device.port}`}><Box sx={{ flex: 1 }}><Typography>{device.name}</Typography><Typography variant="body2" color="text.secondary">{address}:{device.port}</Typography></Box><Button disabled={!address} startIcon={<AddIcon />} onClick={() => address && add({ host: address, port: device.port, displayName: device.name, source: 'discovery', enabled: true })}>Add</Button></Stack>;
                })}
            </Stack></CardContent></Card>

            <Card variant="outlined"><CardContent><Stack spacing={2}>
                <Typography variant="h6">Manual device</Typography><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField fullWidth label="Private IP or local hostname" value={host} onChange={event => setHost(event.target.value)} /><TextField label="Port" type="number" value={port} onChange={event => setPort(Number(event.target.value))} /><Button disabled={!host || testing} onClick={test}>Test</Button><Button variant="contained" disabled={!host} startIcon={<AddIcon />} onClick={() => add({ host, port, source: 'manual', enabled: true })}>Add</Button></Stack>
            </Stack></CardContent></Card>

            <Card variant="outlined"><CardContent><Typography variant="h6" gutterBottom>Configured devices</Typography><Stack spacing={1}>{devices.length === 0 ? <Alert severity="warning">No device configured.</Alert> : devices.map((device, index) => <Stack className="device-row" direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, gap: 1 }} key={`${device.host}:${device.port}`}><Box sx={{ flex: 1 }}><Typography>{device.displayName || device.host}</Typography><Stack direction="row" spacing={1}><Chip size="small" label={device.source} /><Typography variant="body2" color="text.secondary">{device.host}:{device.port}</Typography></Stack></Box><FormControlLabel control={<Switch checked={device.enabled} onChange={event => props.onChange(`devices.${index}.enabled`, event.target.checked)} />} label="Enabled" /><IconButton aria-label={`Remove ${device.displayName || device.host}`} onClick={() => props.onChange('devices', devices.filter((_, itemIndex) => itemIndex !== index))}><DeleteOutlineIcon /></IconButton></Stack>)}</Stack></CardContent></Card>
        </Stack>
    );
}
