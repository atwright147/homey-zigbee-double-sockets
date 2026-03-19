# Aurora Aone AU-A1ZBDSS — Developer Notes

## Device identity

- **Brand**: Aurora Aone
- **Model**: AU-A1ZBDSS (also marketed as "Aone Double Socket 50A")
- **`manufacturerName`**: `"Aurora Lighting"` / `"Aurora"` / `"AURORA"` / `"Aurora Limited"` ← all four must be in the fingerprint (see below)
- **`modelID`**: `"DoubleSocket50AU"` / `"AU-A1ZBDSS"`
- Standard Zigbee 3.0 — **not** Tuya-based; uses standard ZHA clusters throughout

## Node structure

```
Node
├── Endpoint 1  (socket 1 — left)
│   ├── basic (0x0000), identify (0x0003), groups (0x0004), scenes (0x0005)
│   ├── onOff (0x0006)                   ← works fully
│   └── haElectricalMeasurement (0x0B04) ← present but non-functional (see below)
├── Endpoint 2  (socket 2 — right)
│   └── (identical clusters to endpoint 1)
└── Endpoint 3  (backlight LED)
    ├── basic (0x0000), identify (0x0003)
    ├── onOff (0x0006)
    └── levelControl (0x0008)             ← dimmable, not implemented
```

## manufacturerName variants — important

The device reports different `manufacturerName` strings depending on firmware version and possibly pairing state. At least four variants have been observed in the wild:

- `"Aurora Lighting"`
- `"Aurora"`
- `"AURORA"`
- `"Aurora Limited"`

If any of these are missing from the `zigbee.manufacturerName` array in `app.json`, Homey may fail to match the driver and fall back to its own built-in Zigbee app instead, showing the device as a generic "Zigbee Device". All four must be listed.

## On/Off — both sockets

Both endpoints work correctly via the standard `genOnOff` cluster (0x0006). Physical button presses on the device send unsolicited `attr.onOff` attribute reports, which are picked up by the cluster event listener.

`configureAttributeReporting` returns `UNSUP_GENERAL_COMMAND` on this device — this is non-fatal and must be silenced. The driver continues working without confirmed reporting configuration because the device pushes state changes anyway.

The `onoff.socket2` sub-capability **cannot** use `registerCapability` (the `homey-zigbeedriver` library silently fails for dot-notation capability IDs, producing a `set_parser_is_not_a_function` error). Socket 2 must be wired manually via `registerCapabilityListener` + `ep2.clusters.onOff.on('attr.onOff', ...)`. See `lib/ZigBeeDoubleSocketDevice.js` for the implementation.

## Power measurement — non-functional (firmware bug)

`haElectricalMeasurement` (0x0B04) is present in both socket endpoints' cluster descriptor, but the `activePower` attribute returns a **fixed raw value of approximately −8073** regardless of actual load.

Investigation summary:
- Value is always approximately −8073 whether the socket is off, or loaded with a known 54 W draw
- `acPowerDivisor` reports `1` (a lie — the real divisor is 1000; raw values imply milliwatts)
- `Math.abs()` is required since the value is reported as negative
- Clean re-pair with empty sockets did not resolve the stuck reading
- The firmware may have a single shared measurement circuit that is broken or returning a static offset
- Other users in the Zigbee2MQTT community have reported working power readings on this model, suggesting this may be firmware-version specific rather than a fundamental hardware limitation

**Power measurement is not exposed in this driver.** If a future firmware update fixes the issue, it can be re-added via the `onSocketsInit` hook in `ZigBeeDoubleSocketDevice` (see the Scolmore notes and the base class for the hook pattern).

## Endpoint 3 — backlight LED

Endpoint 3 controls the illuminated ring around the physical button. It supports both on/off (via `genOnOff`) and dimming (via `genLevelCtrl`). It is intentionally left uncontrolled in this driver — the LED state tracks the socket 1 state in hardware and toggling it independently is of limited value. No bindings are registered for this endpoint.

## Z2M / other coordinator notes

- Zigbee2MQTT lists this device and reports working power measurements on some units
- OTA firmware updates have been observed to be available via Z2M — if power measurement is broken on your unit, an OTA update may resolve it
- The device uses standard ZHA; there are no Tuya proprietary clusters to worry about
