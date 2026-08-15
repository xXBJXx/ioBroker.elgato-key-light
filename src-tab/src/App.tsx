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
    capturedAt: string;
}
interface DeviceView {
    config: { host: string; port: number; displayName?: string };
    health: { id: string; reachable: boolean; latencyMs?: number; lastSuccess?: string; lastError?: string; consecutiveFailures: number; nextPollAt?: string };
    snapshot?: Snapshot;
    capabilities?: Capabilities;
}
interface Reply<T> { success: boolean; result?: T; message?: string }
interface AppState extends GenericAppState { devices: DeviceView[]; loadingDevices: boolean; diagnostics: unknown | null }

const DEVICE_IMAGE_NAMES = new Set([
    'elgato-key-light',
    'elgato-key-light-air',
    'elgato-key-light-mini',
    'elgato-light-strip',
    'elgato-ring-light',
]);

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
                    this.socket.setState(`${this.adapterName}.${this.instance}.${device.health.id}.light.lights.0.on`, enabled, false),
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
                    {this.state.loadingDevices ? <Box className="center"><CircularProgress /></Box> : this.state.devices.length === 0 ? <Alert severity="info">No configured device. Add one in the adapter configuration.</Alert> : <Grid container spacing={2}>{this.state.devices.map(device => <Grid size={{ xs: 12, md: 6, xl: 4 }} key={device.health.id}><DeviceCard namespace={`${this.adapterName}.${this.instance}`} device={device} socket={this.socket} onCommand={this.command} onRefresh={() => void this.refresh(false)} onError={message => this.showError(message)} /></Grid>)}</Grid>}
                    <DiagnosticsDialog value={this.state.diagnostics} onClose={() => this.setState({ diagnostics: null })} />
                    {this.renderHelperDialogs()}
                </Box>
            </ThemeProvider></StyledEngineProvider>
        );
    }
}

interface DeviceCardProps { namespace: string; device: DeviceView; socket: AdminConnection; onCommand(command: string, payload: Record<string, unknown>): Promise<void>; onRefresh(): void; onError(message: string): void }

function DeviceCard({ namespace, device, socket, onCommand, onRefresh, onError }: DeviceCardProps): React.JSX.Element {
    const snapshot = device.snapshot;
    const light = snapshot?.lights.lights[0];
    const capabilities = snapshot?.capabilities ?? device.capabilities;
    const stateRoot = `${namespace}.${device.health.id}.light.lights.0`;
    const capturedAt = snapshot?.capturedAt;
    const [draftState, setDraftState] = React.useState<{
        capturedAt?: string;
        values: Record<string, string | number | boolean>;
    }>({ values: {} });
    const draft = draftState.capturedAt === capturedAt ? draftState.values : {};
    const setDraftValue = (property: string, value: string | number | boolean): void => {
        setDraftState(current => ({
            capturedAt,
            values: {
                ...(current.capturedAt === capturedAt ? current.values : {}),
                [property]: value,
            },
        }));
    };
    const setValue = async (property: string, value: string | number | boolean, id = `${stateRoot}.${property}`): Promise<void> => {
        setDraftValue(property, value);
        try {
            await socket.setState(id, value, false);
            window.setTimeout(onRefresh, 350);
        } catch (error) {
            setDraftState(current => {
                const next = { ...(current.capturedAt === capturedAt ? current.values : {}) };
                delete next[property];
                return { capturedAt, values: next };
            });
            onError(error instanceof Error ? error.message : String(error));
        }
    };
    const run = (command: string): void => { void onCommand(command, { id: device.health.id }).catch(error => onError(error instanceof Error ? error.message : String(error))); };
    const brightness = typeof draft.brightness === 'number' ? draft.brightness : (light?.brightness ?? 0);
    const serverKelvin = light?.temperature ? Math.round(1_000_000 / light.temperature) : 4_000;
    const kelvin = typeof draft.temperature === 'number' ? draft.temperature : serverKelvin;
    const serverColor = hsvToHex(light?.hue ?? 0, light?.saturation ?? 0, light?.brightness ?? 100);
    const color = typeof draft.hex === 'string' ? draft.hex : serverColor;
    const power = typeof draft.on === 'boolean' ? draft.on : light?.on === 1;
    const studioMode = typeof draft.studioMode === 'boolean' ? draft.studioMode : (snapshot?.settings?.battery?.bypass ?? false);
    const productName = snapshot?.info.productName;
    const image = deviceImage(productName);
    const nextPoll = useNextPoll(device.health.nextPollAt);

    return <Card variant="outlined" className={device.health.reachable ? 'device-card reachable' : 'device-card offline'}>
        {image ? <Box className="device-hero"><Box component="img" className="device-image" src={`./media/${image}.png`} alt={productName || 'Elgato light'} /><Chip className="device-status" color={device.health.reachable ? 'success' : 'error'} size="small" label={device.health.reachable ? 'Online' : 'Offline'} /></Box> : null}
        <CardContent><Stack spacing={2}>
        <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1 }}><Box sx={{ flex: 1 }}><Typography variant="h6">{snapshot?.info.displayName || device.config.displayName || device.config.host}</Typography><Typography variant="body2" color="text.secondary">{productName || `${device.config.host}:${device.config.port}`}</Typography></Box>{image ? null : <Chip color={device.health.reachable ? 'success' : 'error'} size="small" label={device.health.reachable ? 'Online' : 'Offline'} />}</Stack>
        {device.health.reachable && light && capabilities ? <>
            {capabilities.power ? <ControlRow icon={<LightModeIcon />} label="Power"><Switch checked={power} onChange={event => void setValue('on', event.target.checked)} /></ControlRow> : null}
            {capabilities.brightness ? <ControlRow icon={<BoltIcon />} label={`Brightness ${Math.round(brightness)}%`}><Slider aria-label="Brightness" value={brightness} min={0} max={100} onChange={(_, value) => setDraftValue('brightness', Array.isArray(value) ? value[0] : value)} onChangeCommitted={(_, value) => void setValue('brightness', Array.isArray(value) ? value[0] : value)} /></ControlRow> : null}
            {capabilities.temperature ? <ControlRow icon={<LightModeIcon />} label={`Temperature ${kelvin} K`}><Slider aria-label="Color temperature" value={kelvin} min={2900} max={7000} step={50} onChange={(_, value) => setDraftValue('temperature', Array.isArray(value) ? value[0] : value)} onChangeCommitted={(_, value) => void setValue('temperature', Array.isArray(value) ? value[0] : value)} /></ControlRow> : null}
            {capabilities.color ? <ControlRow icon={<ColorLensIcon />} label="Color"><input className="color-input" aria-label="RGB color" type="color" value={color} onChange={event => void setValue('hex', event.target.value)} /></ControlRow> : null}
            {snapshot.battery ? <Stack direction="row" sx={{ justifyContent: 'space-between' }}><Typography>Battery</Typography><Typography>{snapshot.battery.level ?? '—'}% · {snapshot.battery.status}</Typography></Stack> : null}
            {capabilities.studioMode ? <ControlRow icon={<BoltIcon />} label="Studio mode"><Switch checked={studioMode} onChange={event => void setValue('studioMode', event.target.checked, `${namespace}.${device.health.id}.battery.studioMode`)} /></ControlRow> : null}
        </> : <Alert severity="warning">{device.health.lastError || 'Device is currently unreachable.'}</Alert>}
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}><Stack><Typography variant="caption" color="text.secondary">{device.health.latencyMs !== undefined ? `${device.health.latencyMs} ms` : 'No latency sample'}{snapshot?.info.firmwareVersion ? ` · FW ${snapshot.info.firmwareVersion}` : ''}</Typography><Tooltip title={nextPoll.exact}><Typography variant="caption" color="text.secondary">{nextPoll.label}</Typography></Tooltip></Stack><Stack direction="row"><Tooltip title="Identify"><span><IconButton disabled={!device.health.reachable || !capabilities?.identify} aria-label="Identify device" onClick={() => run('identifyDevice')}><LightModeIcon /></IconButton></span></Tooltip><Tooltip title="Reconnect"><IconButton aria-label="Reconnect device" onClick={() => run('reconnectDevice')}><RefreshIcon /></IconButton></Tooltip></Stack></Stack>
    </Stack></CardContent></Card>;
}

function useNextPoll(nextPollAt: string | undefined): { label: string; exact: string } {
    const [now, setNow] = React.useState<number>();
    React.useEffect(() => {
        const update = (): void => setNow(Date.now());
        const initial = window.setTimeout(update, 0);
        const timer = window.setInterval(update, 1_000);
        return () => {
            window.clearTimeout(initial);
            window.clearInterval(timer);
        };
    }, []);

    const timestamp = nextPollAt ? Date.parse(nextPollAt) : Number.NaN;
    if (!Number.isFinite(timestamp)) {
        return { label: 'Next update unknown', exact: 'No next poll timestamp available' };
    }
    if (now === undefined) {
        return { label: 'Next update scheduled', exact: new Date(timestamp).toLocaleString() };
    }
    const remainingSeconds = Math.max(0, Math.ceil((timestamp - now) / 1_000));
    return {
        label: remainingSeconds === 0 ? 'Update due' : `Next update in ${formatDuration(remainingSeconds)}`,
        exact: new Date(timestamp).toLocaleString(),
    };
}

function formatDuration(seconds: number): string {
    if (seconds < 60) {
        return `${seconds} s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return remainder === 0 ? `${minutes} min` : `${minutes} min ${remainder} s`;
}

function deviceImage(productName: string | undefined): string | undefined {
    const normalized = productName
        ?.trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return normalized && DEVICE_IMAGE_NAMES.has(normalized) ? normalized : undefined;
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
