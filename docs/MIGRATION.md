# Migration guide

## From 1.1.x to the rewrite

The rewrite keeps serial-number device roots and the existing writable paths below `<serial>.light.lights.0`. Existing automations for power, brightness, temperature, hue, saturation, `hex` and legacy `rgb` therefore continue to work.

On first startup, `native.devices` is loaded. If it is empty, the adapter reads legacy adapter-owned device objects and imports `native.device.ip`/`port` without deleting the old object tree. A successful contact resolves the stable serial number and persists the normalized device list in instance native configuration.

Important metadata corrections are applied with `extendObject`:

- `hardwareRevision` changes from number to string.
- Color temperature uses `level.color.temperature` and Kelvin.
- RGB/hex uses `level.color.rgb`.
- Reachability, health, battery and capabilities are additive.

No broad or automatic stale-state deletion occurs in this release. This avoids breaking scripts that still reference legacy data. Back up the instance object and adapter states before upgrading, then confirm device reachability and a read/write cycle for each model.

## Configuration changes

Device configuration now has a normal Admin configuration page. Polling remains `native.interval` in seconds. New defaults are request timeout 3000 ms, maximum backoff 300 seconds, write debounce 200 ms, discovery timeout 5000 ms and automatic discovery-add disabled.

The former private `iobroker-react` tab and its embedded configuration editing are removed. Live control remains in the adapter tab; persistent configuration belongs to the instance configuration page.

## Rollback

Keep an ioBroker backup made before the upgrade. The rewrite does not delete legacy device roots, but the old adapter does not understand `native.devices`. For rollback, restore the backed-up instance/object configuration or manually re-add devices using the old tab.
