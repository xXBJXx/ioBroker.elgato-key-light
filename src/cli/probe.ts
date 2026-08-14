import process from 'node:process';

import { ElgatoClient } from '../elgato/ElgatoClient';

async function main(): Promise<void> {
    const [host, portArgument] = process.argv.slice(2);

    if (!host || host === '--help' || host === '-h') {
        console.log('Usage: npm run elgato:probe -- <private-ip-or-local-hostname> [port]');
        console.log('Performs safe GET requests only and prints a sanitized JSON snapshot.');
        process.exitCode = host ? 0 : 1;
        return;
    }

    const port = portArgument === undefined ? 9123 : Number(portArgument);
    const client = new ElgatoClient(host, port, {
        timeoutMs: 5_000,
        logger: {
            debug: message => console.error(message),
            silly: message => console.error(message),
        },
    });

    try {
        const snapshot = await client.snapshot();
        const sanitized = {
            ...snapshot,
            info: {
                ...snapshot.info,
                serialNumber: redact(snapshot.info.serialNumber),
                macAddress: snapshot.info.macAddress ? redact(snapshot.info.macAddress) : undefined,
                wifiInfo: snapshot.info.wifiInfo ? { ...snapshot.info.wifiInfo, ssid: '<redacted>' } : undefined,
            },
        };
        console.log(JSON.stringify(sanitized, null, 2));
    } catch (error) {
        console.error(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
        process.exitCode = 1;
    }
}

function redact(value: string): string {
    if (value.length <= 4) {
        return '<redacted>';
    }
    return `${value.slice(0, 2)}…${value.slice(-2)}`;
}

void main();
