import React from 'react';
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import BoltIcon from '@mui/icons-material/Bolt';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LightModeIcon from '@mui/icons-material/LightMode';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SpeedIcon from '@mui/icons-material/Speed';
import TroubleshootIcon from '@mui/icons-material/Troubleshoot';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
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
    I18n,
    Loader,
    type AdminConnection,
    type GenericAppProps,
    type GenericAppSettings,
    type GenericAppState,
} from '@iobroker/gui-components';

interface Capabilities { power: boolean; brightness: boolean; temperature: boolean; color: boolean; battery: boolean; studioMode: boolean; identify: boolean; settings?: boolean; multipleLights?: boolean; scenes?: boolean }
interface Light { id?: number; name?: string; on?: number; brightness?: number; temperature?: number; hue?: number; saturation?: number; numberOfSceneElements?: number }
interface Snapshot {
    target?: { host: string; port: number };
    info: { productName: string; serialNumber: string; displayName: string; firmwareVersion?: string; firmwareBuildNumber?: number; hardwareBoardType?: number; hardwareRevision?: string; macAddress?: string; features?: string[]; wifiInfo?: { frequencyMHz?: number; rssi?: number } };
    lights: { lights: Light[] };
    battery?: { level?: number; status: string; powerSource: string; currentBatteryVoltageV?: number; inputChargeVoltageV?: number; inputChargeCurrentA?: number };
    settings?: { powerOnBehavior?: number; powerOnBrightness?: number; powerOnTemperature?: number; powerOnHue?: number; powerOnSaturation?: number; switchOnDurationMs?: number; switchOffDurationMs?: number; colorChangeDurationMs?: number; battery?: { bypass?: boolean } };
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

const translations: GenericAppSettings['translations'] = {
    en: {},
    de: {
        'Local device dashboard': 'Lokales Geräte-Dashboard', 'All on': 'Alle ein', 'All off': 'Alle aus',
        Diagnostics: 'Diagnose', Refresh: 'Aktualisieren', Online: 'Online', Offline: 'Offline', Power: 'Ein/Aus',
        Brightness: 'Helligkeit', Temperature: 'Farbtemperatur', Color: 'Farbe', Battery: 'Akku',
        'Studio mode': 'Studiomodus', Identify: 'Identifizieren', Reconnect: 'Neu verbinden', Copy: 'Kopieren',
        'Export JSON': 'JSON exportieren', Close: 'Schließen', 'Update due': 'Aktualisierung fällig',
        'Next update unknown': 'Nächste Aktualisierung unbekannt', 'Next update scheduled': 'Nächste Aktualisierung geplant',
        'Next update in': 'Nächste Aktualisierung in', 'Device information': 'Geräteinformationen',
        Connection: 'Verbindung', 'API requests': 'API-Abfragen', 'Device details': 'Gerätedetails',
        Capabilities: 'Funktionen', 'Current values': 'Aktuelle Werte', 'Last successful poll': 'Letzte erfolgreiche Abfrage',
        'Snapshot captured': 'Snapshot erstellt', 'Consecutive failures': 'Fehler in Folge', Serial: 'Seriennummer',
        Hardware: 'Hardware', Features: 'Merkmale', 'Wi-Fi signal': 'WLAN-Signal', Endpoint: 'Endpunkt',
        'Next poll': 'Nächste Abfrage', On: 'Ein', Off: 'Aus',
    },
};

const t = (text: string): string => I18n.t(text);

export default class App extends GenericApp<GenericAppProps, AppState> {
    private refreshTimer: number | undefined;

    public constructor(props: GenericAppProps) {
        const settings: GenericAppSettings = {
            ...props,
            bottomButtons: false,
            socket: { port: Number(window.location.port) === 3000 ? 8081 : Number(window.location.port) },
            translations,
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
                        <Box><Typography variant="h4">Elgato Lights</Typography><Typography color="text.secondary">{t('Local device dashboard')}</Typography></Box>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}><Button onClick={() => void this.setAllPower(true)}>{t('All on')}</Button><Button onClick={() => void this.setAllPower(false)}>{t('All off')}</Button><Button startIcon={<TroubleshootIcon />} onClick={this.showDiagnostics}>{t('Diagnostics')}</Button><Button startIcon={<RefreshIcon />} onClick={() => void this.refresh()}>{t('Refresh')}</Button></Stack>
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
    const [infoOpen, setInfoOpen] = React.useState(false);

    const displayName = snapshot?.info.displayName || device.config.displayName || device.config.host;
    const batteryLevel = snapshot?.battery?.level;

    return <Card elevation={0} className={device.health.reachable ? 'device-card reachable' : 'device-card offline'}>
        <Box className="device-hero">
            <Box className="hero-glow" />
            {image ? <Box component="img" className="device-image" src={`./media/${image}.png`} alt={productName || 'Elgato light'} /> : <LightModeIcon className="device-placeholder" />}
            <Chip className="device-status" color={device.health.reachable ? 'success' : 'error'} size="small" label={device.health.reachable ? t('Online') : t('Offline')} />
        </Box>
        <CardContent className="device-card-content"><Stack spacing={2.25} sx={{ height: '100%' }}>
        <Box className="device-heading"><Typography variant="h6" className="device-name">{displayName}</Typography><Typography variant="body2" color="text.secondary">{productName || `${device.config.host}:${device.config.port}`}</Typography></Box>
        <Stack className="device-meta" direction="row" spacing={1}>
            <Chip icon={<SpeedIcon />} size="small" variant="outlined" label={device.health.latencyMs !== undefined ? `${device.health.latencyMs} ms` : 'No latency sample'} />
            {snapshot?.info.firmwareVersion ? <Chip size="small" variant="outlined" label={`FW ${snapshot.info.firmwareVersion}`} /> : null}
        </Stack>
        <Box className="controls-surface">
        {device.health.reachable && light && capabilities ? <Stack spacing={1.5}>
            {capabilities.power ? <ControlRow inline icon={<PowerSettingsNewIcon />} label={t('Power')}><Switch slotProps={{ input: { 'aria-label': t('Power') } }} checked={power} onChange={event => void setValue('on', event.target.checked)} /></ControlRow> : null}
            {capabilities.brightness ? <ControlRow icon={<BoltIcon />} label={`${t('Brightness')} ${Math.round(brightness)}%`}><Slider aria-label={t('Brightness')} value={brightness} min={0} max={100} onChange={(_, value) => setDraftValue('brightness', Array.isArray(value) ? value[0] : value)} onChangeCommitted={(_, value) => void setValue('brightness', Array.isArray(value) ? value[0] : value)} /></ControlRow> : null}
            {capabilities.temperature ? <ControlRow icon={<LightModeIcon />} label={`${t('Temperature')} ${kelvin} K`}><Slider aria-label={t('Temperature')} value={kelvin} min={2900} max={7000} step={50} onChange={(_, value) => setDraftValue('temperature', Array.isArray(value) ? value[0] : value)} onChangeCommitted={(_, value) => void setValue('temperature', Array.isArray(value) ? value[0] : value)} /></ControlRow> : null}
            {capabilities.color ? <ControlRow icon={<ColorLensIcon />} label={t('Color')}><input className="color-input" aria-label="RGB color" type="color" value={color} onChange={event => void setValue('hex', event.target.value)} /></ControlRow> : null}
            {snapshot.battery ? <Box className="battery-panel"><Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><BatteryChargingFullIcon fontSize="small" /><Typography variant="body2">{t('Battery')}</Typography></Stack><Typography variant="body2" sx={{ fontWeight: 600 }}>{batteryLevel ?? '—'}% · {snapshot.battery.status}</Typography></Stack><Box className="battery-track"><Box className="battery-fill" sx={{ width: `${Math.max(0, Math.min(100, batteryLevel ?? 0))}%` }} /></Box></Box> : null}
            {capabilities.studioMode ? <ControlRow inline icon={<BoltIcon />} label={t('Studio mode')}><Switch slotProps={{ input: { 'aria-label': t('Studio mode') } }} checked={studioMode} onChange={event => void setValue('studioMode', event.target.checked, `${namespace}.${device.health.id}.battery.studioMode`)} /></ControlRow> : null}
        </Stack> : <Alert severity="warning" className="offline-alert">{device.health.lastError || 'Device is currently unreachable.'}</Alert>}
        </Box>
        <Stack className="device-footer" direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}><Tooltip title={nextPoll.exact}><Stack className="poll-status" direction="row" spacing={1} sx={{ alignItems: 'center' }}><ScheduleIcon fontSize="small" /><Typography variant="caption">{nextPoll.label}</Typography></Stack></Tooltip><Stack direction="row" spacing={0.5}><Tooltip title={t('Device information')}><IconButton className="card-action" aria-label={`${t('Device information')} ${displayName}`} onClick={() => setInfoOpen(true)}><InfoOutlinedIcon /></IconButton></Tooltip><Tooltip title={t('Identify')}><span><IconButton className="card-action" disabled={!device.health.reachable || !capabilities?.identify} aria-label="Identify device" onClick={() => run('identifyDevice')}><LightModeIcon /></IconButton></span></Tooltip><Tooltip title={t('Reconnect')}><IconButton className="card-action" aria-label="Reconnect device" onClick={() => run('reconnectDevice')}><RefreshIcon /></IconButton></Tooltip></Stack></Stack>
    </Stack></CardContent><DeviceInfoDialog open={infoOpen} onClose={() => setInfoOpen(false)} device={device} /></Card>;
}

function DeviceInfoDialog({ open, onClose, device }: { open: boolean; onClose(): void; device: DeviceView }): React.JSX.Element {
    const snapshot = device.snapshot;
    const capabilities = snapshot?.capabilities ?? device.capabilities;
    const light = snapshot?.lights.lights[0];
    const host = snapshot?.target?.host ?? device.config.host;
    const port = snapshot?.target?.port ?? device.config.port;
    const apiBase = `http://${host.includes(':') && !host.startsWith('[') ? `[${host}]` : host}:${port}`;
    const endpoints = [
        'GET /elgato/accessory-info',
        'GET, PUT /elgato/lights',
        ...(capabilities?.settings ? ['GET, PUT /elgato/lights/settings'] : []),
        ...(capabilities?.battery ? ['GET /elgato/battery-info'] : []),
        ...(capabilities?.identify ? ['POST /elgato/identify'] : []),
    ];
    const enabledCapabilities = capabilities
        ? Object.entries(capabilities).filter(([, enabled]) => enabled).map(([name]) => name)
        : [];
    const displayName = snapshot?.info.displayName || device.config.displayName || device.config.host;

    return <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby={`device-info-${device.health.id}`}>
        <DialogTitle id={`device-info-${device.health.id}`}><Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}><Box className="dialog-icon"><InfoOutlinedIcon /></Box><Box><Typography variant="h6">{t('Device information')}</Typography><Typography variant="body2" color="text.secondary">{displayName}</Typography></Box></Stack></DialogTitle>
        <DialogContent dividers><Stack spacing={2.5}>
            <InfoSection title={t('Connection')}>
                <InfoRow label={t('Endpoint')} value={apiBase} mono />
                <InfoRow label={t('Last successful poll')} value={formatDateTime(device.health.lastSuccess)} />
                <InfoRow label={t('Next poll')} value={formatDateTime(device.health.nextPollAt)} />
                <InfoRow label={t('Snapshot captured')} value={formatDateTime(snapshot?.capturedAt)} />
                <InfoRow label={t('Consecutive failures')} value={String(device.health.consecutiveFailures)} />
            </InfoSection>
            <InfoSection title={t('API requests')}>
                <Stack spacing={0.75}>{endpoints.map(endpoint => <Box component="code" className="api-endpoint" key={endpoint}>{endpoint}</Box>)}</Stack>
            </InfoSection>
            <InfoSection title={t('Device details')}>
                <InfoRow label={t('Serial')} value={snapshot?.info.serialNumber ?? device.health.id} mono />
                <InfoRow label="Firmware" value={[snapshot?.info.firmwareVersion, snapshot?.info.firmwareBuildNumber !== undefined ? `Build ${snapshot.info.firmwareBuildNumber}` : undefined].filter(Boolean).join(' · ') || '—'} />
                <InfoRow label={t('Hardware')} value={[snapshot?.info.hardwareRevision, snapshot?.info.hardwareBoardType !== undefined ? `Board ${snapshot.info.hardwareBoardType}` : undefined].filter(Boolean).join(' · ') || '—'} />
                <InfoRow label="MAC" value={snapshot?.info.macAddress ?? '—'} mono />
                <InfoRow label={t('Wi-Fi signal')} value={snapshot?.info.wifiInfo ? [snapshot.info.wifiInfo.rssi !== undefined ? `${snapshot.info.wifiInfo.rssi} dBm` : undefined, snapshot.info.wifiInfo.frequencyMHz !== undefined ? `${snapshot.info.wifiInfo.frequencyMHz} MHz` : undefined].filter(Boolean).join(' · ') || '—' : '—'} />
                <InfoRow label={t('Features')} value={snapshot?.info.features?.join(', ') || '—'} />
            </InfoSection>
            <InfoSection title={t('Capabilities')}><Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>{enabledCapabilities.length > 0 ? enabledCapabilities.map(capability => <Chip size="small" label={capability} key={capability} />) : <Typography variant="body2">—</Typography>}</Stack></InfoSection>
            {light ? <InfoSection title={t('Current values')}>
                <InfoRow label={t('Power')} value={light.on === 1 ? t('On') : t('Off')} />
                <InfoRow label={t('Brightness')} value={light.brightness !== undefined ? `${light.brightness}%` : '—'} />
                <InfoRow label={t('Temperature')} value={light.temperature ? `${Math.round(1_000_000 / light.temperature)} K (${light.temperature} mired)` : '—'} />
                <InfoRow label="Hue / saturation" value={light.hue !== undefined || light.saturation !== undefined ? `${light.hue ?? '—'}° / ${light.saturation ?? '—'}%` : '—'} />
                {snapshot?.battery ? <InfoRow label={t('Battery')} value={`${snapshot.battery.level ?? '—'}% · ${snapshot.battery.status} · ${snapshot.battery.powerSource}`} /> : null}
            </InfoSection> : null}
        </Stack></DialogContent>
        <DialogActions><Button onClick={onClose}>{t('Close')}</Button></DialogActions>
    </Dialog>;
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
    return <Box><Typography className="info-section-title" variant="overline" color="text.secondary">{title}</Typography><Box className="device-info-grid">{children}</Box></Box>;
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }): React.JSX.Element {
    return <><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="body2" className={mono ? 'info-value mono' : 'info-value'}>{value}</Typography></>;
}

function formatDateTime(value: string | undefined): string {
    if (!value) return '—';
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : value;
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
        return { label: t('Next update unknown'), exact: 'No next poll timestamp available' };
    }
    if (now === undefined) {
        return { label: t('Next update scheduled'), exact: new Date(timestamp).toLocaleString() };
    }
    const remainingSeconds = Math.max(0, Math.ceil((timestamp - now) / 1_000));
    return {
        label: remainingSeconds === 0 ? t('Update due') : `${I18n.t('Next update in')} ${formatDuration(remainingSeconds)}`,
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

function ControlRow({ icon, label, children, inline = false }: { icon: React.ReactNode; label: string; children: React.ReactNode; inline?: boolean }): React.JSX.Element {
    return <Stack className={`control-row${inline ? ' inline' : ''}`} direction="row" spacing={1.5}><Box className="control-icon">{icon}</Box><Box className="control-content"><Typography variant="body2" className="control-label">{label}</Typography>{children}</Box></Stack>;
}

function DiagnosticsDialog({ value, onClose }: { value: unknown | null; onClose(): void }): React.JSX.Element {
    const text = JSON.stringify(value, null, 2);
    const copy = (): void => void navigator.clipboard.writeText(text);
    const download = (): void => {
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'elgato-key-light-diagnostics.json';
        link.click();
        URL.revokeObjectURL(url);
    };
    return <Dialog open={value !== null} onClose={onClose} maxWidth="md" fullWidth aria-labelledby="diagnostics-title"><DialogTitle id="diagnostics-title">{t('Diagnostics')}</DialogTitle><DialogContent><pre className="diagnostics">{text}</pre></DialogContent><DialogActions><Button startIcon={<ContentCopyIcon />} onClick={copy}>{t('Copy')}</Button><Button startIcon={<DownloadIcon />} onClick={download}>{t('Export JSON')}</Button><Button onClick={onClose}>{t('Close')}</Button></DialogActions></Dialog>;
}

function hsvToHex(hue: number, saturation: number, value: number): string {
    const chroma = (value / 100) * (saturation / 100);
    const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = value / 100 - chroma;
    const [red, green, blue] = hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x];
    return `#${[red, green, blue].map(channel => Math.round((channel + m) * 255).toString(16).padStart(2, '0')).join('')}`;
}
