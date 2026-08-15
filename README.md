![Logo](admin/elgato-key-light.png)

# ioBroker.elgato-key-light

[![NPM version](https://img.shields.io/npm/v/iobroker.elgato-key-light.svg)](https://www.npmjs.com/package/iobroker.elgato-key-light)
[![Downloads](https://img.shields.io/npm/dm/iobroker.elgato-key-light.svg)](https://www.npmjs.com/package/iobroker.elgato-key-light)
![Installations](https://iobroker.live/badges/elgato-key-light-installed.svg)
![Stable](https://iobroker.live/badges/elgato-key-light-stable.svg)

Local, cloud-free control of Elgato Wi-Fi lights from ioBroker. The adapter discovers `_elg._tcp.local.` services with Bonjour/mDNS and also supports manual private IP or local hostname configuration.

## Requirements

- Node.js 22.18 or newer
- js-controller 7.2.2 or newer
- Admin 7.8.23 or newer
- ioBroker and the lights must be able to reach each other on the local network (normally TCP port 9123 and multicast DNS UDP 5353)

## Supported capabilities

Controls are created from the device response, not from a hard-coded product name.

| Capability | Key Light / Air / Ring | Key Light Mini | Light Strip |
| --- | --- | --- | --- |
| Power and brightness | Yes | Yes | Yes |
| Color temperature | Yes | Yes | If reported |
| Hue, saturation and RGB | If reported | If reported | Yes |
| Battery and charging data | No | Yes | No |
| Studio mode / battery bypass | No | When reported | No |
| Identify | Yes | Yes | Yes |

Light Strip scenes/effects and restart are deliberately not exposed because their behavior has not yet been verified across the supported hardware and firmware matrix.

## Setup

Open the adapter configuration page. You can scan the network and add a result, or enter a private IP/`.local` hostname and port manually. Discovery is convenient, but manual setup remains available for VLANs or networks that block multicast. Save the configuration to restart the instance with the new device list.

The separate adapter tab is the responsive control dashboard. It only shows controls supported by each device and includes reachability, latency, battery information, identify, reconnect and sanitized diagnostics.

## States and compatibility

Device roots continue to use the Elgato serial number. Existing writable IDs below `<serial>.light.lights.0.*` are retained:

- `on`, `brightness`, `temperature`
- `hue`, `saturation`, `hex`, `rgb` where supported

Additive `health`, `battery`, capability and diagnostics states provide explicit availability information. `hardwareRevision` is now a string because current firmware can return values such as `"1.0"`. Details are in [docs/MIGRATION.md](docs/MIGRATION.md).

## Network and privacy

All device control uses local unauthenticated HTTP. Host validation accepts private/link-local addresses and local hostnames only; URL schemes, credentials, paths and public IP addresses are rejected. The adapter does not require a cloud account. SSID values and stable identifiers are removed from diagnostics/probe output.

If discovery fails across a VLAN, allow mDNS reflection/UDP 5353 as appropriate and TCP 9123 from the ioBroker host to the light, or configure the private address manually. Avoid polling faster than necessary; the default is 60 seconds and writes are serialized/coalesced per device.

## Development and diagnostics

```shell
npm ci
npm run check
npm test
npm run build
npm run elgato:probe -- 192.168.1.50 9123
```

The probe performs GET requests only and redacts serial number, MAC address and SSID. Architecture, protocol evidence and the modernization audit are documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/ELGATO_API.md](docs/ELGATO_API.md) and [docs/REPOSITORY_AUDIT.md](docs/REPOSITORY_AUDIT.md).

## Changelog

### **WORK IN PROGRESS**

- Complete backend rewrite with validated native HTTP client, capability detection, per-device queues, bounded requests and retry/backoff.
- Restored bounded Bonjour/mDNS discovery with manual setup fallback.
- Added Key Light Mini battery/studio-mode support and response-driven RGB/temperature controls.
- Replaced the private React 17 UI dependency with React 19, MUI 9, Vite 8 and official ioBroker GUI components.
- Added a normal configuration page, responsive dashboard, health states, diagnostics, migration documentation and focused tests.
- Requires Node.js >= 22.18, js-controller >= 7.2.2 and Admin >= 7.8.23.

### 1.1.0 (2024-04-14)

- Adapter requires Node.js 18 and js-controller >= 5.
- Dependencies updated.

Older entries: [CHANGELOG_OLD.md](CHANGELOG_OLD.md)

## License

Created by xXBJXx and maintained by ioBroker Community Adapters. Elgato is a trademark of Corsair GmbH; this project is not affiliated with or endorsed by Elgato/Corsair.

Copyright (c) 2024-2026 iobroker-community-adapters and 2023 xXBJXx

Released under the MIT License. See [LICENSE](LICENSE).
