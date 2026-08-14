import React from 'react';
import BoltIcon from '@mui/icons-material/Bolt';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import LightModeIcon from '@mui/icons-material/LightMode';
import RefreshIcon from '@mui/icons-material/Refresh';
import TroubleshootIcon from '@mui/icons-material/Troubleshoot';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Slider,
    Stack,
    Switch,
    Tooltip,
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

interface Capabilities { power: boolean; brightness: boolean; temperature: boolean; color: boolean; battery: boolean; studioMode: boolean; identify: boolean }
interface Light { on?: number; brightness?: number; temperature?: number; hue?: number; saturation?: number }
interface Snapshot {
    info: { productName: string; serialNumber: string; displayName: string; firmwareVersion?: string };
    lights: { lights: Light[] };
    battery?: { level?: number; status: string; powerSource: string };
    settings?: { battery?: { bypass?: boolean } };
    capabilities: Capabilities;
}
interface DeviceView {
    config: { host: string; port: number; displayName?: string };
    health: { id: string; reachable: boolean; latencyMs?: number; lastSuccess?: string; lastError?: string; consecutiveFailures: number };
    snapshot?: Snapshot;
    capabilities?: Capabilities;
}
interface Reply<T> { success: boolean; result?: T; message?: string }
interface AppState extends GenericAppState { devices: DeviceView[]; loadingDevices: boolean; diagnostics: unknown | null }

export default class App extends GenericApp<GenericAppProps, AppState> {
    private refreshTimer: number | undefined;

    public constructor(props: GenericAppProps) {
        const settings: GenericAppSettings = {
            ...props,
            bottomButtons: false,
            socket: { port: Number(window.location.port) === 3000 ? 8081 : Number(window.location.port) },
        };
        super(props, settings);
        this.state = { ...this.state, devices: [], loadingDevices: true, diagnostics: null };
    }

    public onConnectionReady(): void {
        void this.refresh();
        this.refreshTimer = window.setInterval(() => void this.refresh(false), 5_000);
    }

    public componentWillUnmount(): void {
        if (this.refreshTimer !== undefined) window.clearInterval(this.refreshTimer);
        super.componentWillUnmount();
    }

    private refresh = async (showLoader = true): Promise<void> => {
        if (showLoader) this.setState({ loadingDevices: true });
        try {
            const response = await this.socket.sendTo<Reply<DeviceView[]>>(this.instanceId, 'getDevices', {});
            if (!response.success) throw new Error(response.message || 'Could not load devices');
            this.setState({ devices: response.result ?? [] });
        } catch (error) {
            this.showError(error instanceof Error ? error.message : String(error));
        } finally {
            if (showLoader) this.setState({ loadingDevices: false });
        }
    };

    private command = async (command: string, payload: Record<string, unknown>): Promise<void> => {
        const response = await this.socket.sendTo<Reply<unknown>>(this.instanceId, command, payload);
        if (!response.success) throw new Error(response.message || `${command} failed`);
        await this.refresh(false);
    };

    private showDiagnostics = async (): Promise<void> => {
        try {
            const response = await this.socket.sendTo<Reply<unknown>>(this.instanceId, 'getDiagnostics', {});
            if (!response.success) throw new Error(response.message || 'Diagnostics failed');
            this.setState({ diagnostics: response.result ?? {} });
        } catch (error) {
            this.showError(error instanceof Error ? error.message : String(error));
        }
    };

    private setAllPower = async (enabled: boolean): Promise<void> => {
        const targets = this.state.devices.filter(
            device => device.health.reachable && (device.snapshot?.capabilities ?? device.capabilities)?.power,
        );
        try {
            await Promise.all(
                targets.map(device =>
                    this.socket.setState(`${this.instanceId}.${device.health.id}.light.lights.0.on`, enabled, false),
                ),
            );
            window.setTimeout(() => void this.refresh(false), 500);
        } catch (error) {
            this.showError(error instanceof Error ? error.message : String(error));
        }
    };

    public render(): React.JSX.Element {
        if (!this.state.loaded) return <StyledEngineProvider injectFirst><ThemeProvider theme={this.state.theme}><Loader themeType={this.state.themeType} /></ThemeProvider></StyledEngineProvider>;
        return (
            <StyledEngineProvider injectFirst><ThemeProvider theme={this.state.theme}>
                <Box className="dashboard" sx={{ bgcolor: 'background.default', color: 'text.primary' }}>
                    <Stack className="toolbar" direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2 }}>
                        <Box><Typography variant="h4">Elgato Lights</Typography><Typography color="text.secondary">Local device dashboard</Typography></Box>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}><Button onClick={() => void this.setAllPower(true)}>All on</Button><Button onClick={() => void this.setAllPower(false)}>All off</Button><Button startIcon={<TroubleshootIcon />} onClick={this.showDiagnostics}>Diagnostics</Button><Button startIcon={<RefreshIcon />} onClick={() => void this.refresh()}>Refresh</Button></Stack>
                    </Stack>
                    {this.state.loadingDevices ? <Box className="center"><CircularProgress /></Box> : this.state.devices.length === 0 ? <Alert severity="info">No configured device. Add one in the adapter configuration.</Alert> : <Grid container spacing={2}>{this.state.devices.map(device => <Grid size={{ xs: 12, md: 6, xl: 4 }} key={device.health.id}><DeviceCard namespace={this.instanceId} device={device} socket={this.socket} onCommand={this.command} onError={message => this.showError(message)} /></Grid>)}</Grid>}
                    <DiagnosticsDialog value={this.state.diagnostics} onClose={() => this.setState({ diagnostics: null })} />
                    {this.renderHelperDialogs()}
                </Box>
            </ThemeProvider></StyledEngineProvider>
        );
    }
}

interface DeviceCardProps { namespace: string; device: DeviceView; socket: AdminConnection; onCommand(command: string, payload: Record<string, unknown>): Promise<void>; onError(message: string): void }

function DeviceCard({ namespace, device, socket, onCommand, onError }: DeviceCardProps): React.JSX.Element {
    const snapshot = device.snapshot;
    const light = snapshot?.lights.lights[0];
    const capabilities = snapshot?.capabilities ?? device.capabilities;
    const stateRoot = `${namespace}.${device.health.id}.light.lights.0`;
    const setValue = async (property: string, value: string | number | boolean): Promise<void> => {
        try { await socket.setState(`${stateRoot}.${property}`, value, false); }
        catch (error) { onError(error instanceof Error ? error.message : String(error)); }
    };
    const run = (command: string): void => { void onCommand(command, { id: device.health.id }).catch(error => onError(error instanceof Error ? error.message : String(error))); };
    const kelvin = light?.temperature ? Math.round(1_000_000 / light.temperature) : 4_000;
    const color = hsvToHex(light?.hue ?? 0, light?.saturation ?? 0, light?.brightness ?? 100);

    return <Card variant="outlined" className={device.health.reachable ? 'device-card reachable' : 'device-card offline'}><CardContent><Stack spacing={2}>
        <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1 }}><Box sx={{ flex: 1 }}><Typography variant="h6">{snapshot?.info.displayName || device.config.displayName || device.config.host}</Typography><Typography variant="body2" color="text.secondary">{snapshot?.info.productName || `${device.config.host}:${device.config.port}`}</Typography></Box><Chip color={device.health.reachable ? 'success' : 'error'} size="small" label={device.health.reachable ? 'Online' : 'Offline'} /></Stack>
        {device.health.reachable && light && capabilities ? <>
            {capabilities.power ? <ControlRow icon={<LightModeIcon />} label="Power"><Switch checked={light.on === 1} onChange={event => void setValue('on', event.target.checked)} /></ControlRow> : null}
            {capabilities.brightness ? <ControlRow icon={<BoltIcon />} label={`Brightness ${Math.round(light.brightness ?? 0)}%`}><Slider aria-label="Brightness" value={light.brightness ?? 0} min={0} max={100} onChangeCommitted={(_, value) => void setValue('brightness', Array.isArray(value) ? value[0] : value)} /></ControlRow> : null}
            {capabilities.temperature ? <ControlRow icon={<LightModeIcon />} label={`Temperature ${kelvin} K`}><Slider aria-label="Color temperature" value={kelvin} min={2900} max={7000} step={50} onChangeCommitted={(_, value) => void setValue('temperature', Array.isArray(value) ? value[0] : value)} /></ControlRow> : null}
            {capabilities.color ? <ControlRow icon={<ColorLensIcon />} label="Color"><input className="color-input" aria-label="RGB color" type="color" value={color} onChange={event => void setValue('hex', event.target.value)} /></ControlRow> : null}
            {snapshot.battery ? <Stack direction="row" sx={{ justifyContent: 'space-between' }}><Typography>Battery</Typography><Typography>{snapshot.battery.level ?? '—'}% · {snapshot.battery.status}</Typography></Stack> : null}
            {capabilities.studioMode ? <ControlRow icon={<BoltIcon />} label="Studio mode"><Switch checked={snapshot.settings?.battery?.bypass ?? false} onChange={event => void socket.setState(`${namespace}.${device.health.id}.battery.studioMode`, event.target.checked, false).catch(error => onError(error instanceof Error ? error.message : String(error)))} /></ControlRow> : null}
        </> : <Alert severity="warning">{device.health.lastError || 'Device is currently unreachable.'}</Alert>}
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}><Typography variant="caption" color="text.secondary">{device.health.latencyMs !== undefined ? `${device.health.latencyMs} ms` : 'No latency sample'}{snapshot?.info.firmwareVersion ? ` · FW ${snapshot.info.firmwareVersion}` : ''}</Typography><Stack direction="row"><Tooltip title="Identify"><span><IconButton disabled={!device.health.reachable || !capabilities?.identify} aria-label="Identify device" onClick={() => run('identifyDevice')}><LightModeIcon /></IconButton></span></Tooltip><Tooltip title="Reconnect"><IconButton aria-label="Reconnect device" onClick={() => run('reconnectDevice')}><RefreshIcon /></IconButton></Tooltip></Stack></Stack>
    </Stack></CardContent></Card>;
}

function ControlRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }): React.JSX.Element {
    return <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}><Box className="control-icon">{icon}</Box><Box sx={{ flex: 1 }}><Typography variant="body2" gutterBottom>{label}</Typography>{children}</Box></Stack>;
}

function DiagnosticsDialog({ value, onClose }: { value: unknown | null; onClose(): void }): React.JSX.Element {
    return <Dialog open={value !== null} onClose={onClose} maxWidth="md" fullWidth><DialogTitle>Diagnostics</DialogTitle><DialogContent><pre className="diagnostics">{JSON.stringify(value, null, 2)}</pre></DialogContent><DialogActions><Button onClick={onClose}>Close</Button></DialogActions></Dialog>;
}

function hsvToHex(hue: number, saturation: number, value: number): string {
    const chroma = (value / 100) * (saturation / 100);
    const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = value / 100 - chroma;
    const [red, green, blue] = hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x];
    return `#${[red, green, blue].map(channel => Math.round((channel + m) * 255).toString(16).padStart(2, '0')).join('')}`;
}
