# Scolmore Click Smart+ Double Socket — Device Research Notes

Documented during development of the `com.zigbee-double-socket` Homey app (March 2026).
Intended to help anyone adding this device to a Homey app, Zigbee2MQTT, Home Assistant,
or any other Zigbee controller.

---

## Device identity

| Field | Value |
|---|---|
| Brand | Scolmore Click Smart+ |
| Form factor | UK 13A double socket (2-gang), faceplate replacement |
| Manufacturer string (`manufacturerName`) | `_TYZB01_hlla45kx` |
| Model string (`modelID` / `productId`) | `TS011F` |
| Zigbee standard | Zigbee 3.0 |
| Chip vendor | Tuya (based on TS011F identifier) |

> **Note:** The marketing name "Click Smart+" and the product code printed on the
> packaging (`SM-SO306EZ-10` has been cited online) are **not** what the device
> advertises over Zigbee. The strings above are what the device actually reports
> during pairing and are the only values that matter for fingerprinting.

---

## Zigbee node structure

```
Node
├── Receive when idle: true
├── Endpoint 1  (socket 1 — left / top)
│   ├── basic               (cluster 0x0000)
│   ├── groups              (cluster 0x0004)
│   ├── scenes              (cluster 0x0005)
│   ├── onOff               (cluster 0x0006)  ← works fully
│   └── electricalMeasurement (cluster 0x0B04) ← present but non-functional (see below)
└── Endpoint 2  (socket 2 — right / bottom)
    ├── basic
    ├── groups
    ├── scenes
    ├── onOff               ← works fully
    └── electricalMeasurement ← present but non-functional (see below)
```

---

## On/off control

Both endpoints respond correctly to standard ZHA `genOnOff` commands:

- `setOn` / `setOff` work on both endpoints 1 and 2 independently.
- The device sends back unsolicited `attr.onOff` reports in response to commands,
  confirming the new state.
- Physical button presses on the socket faceplate also trigger `attr.onOff` reports,
  so Homey/HA stay in sync without polling.

### Important: homey-zigbeedriver sub-capability bug

When using `homey-zigbeedriver`, **do not** use `registerCapability` for `onoff.socket2`
(or any sub-capability using dot notation). The library looks up a built-in defaults
table keyed by exact capability ID. `onoff` is a built-in key and works. `onoff.socket2`
is not, so the set handler is stored as `undefined`, producing:

```
TypeError: set_parser_is_not_a_function
```

**Fix:** wire socket 2 manually using `registerCapabilityListener` for app→device,
and `ep2.clusters.onOff.on('attr.onOff', ...)` for device→app:

```js
// Capability → Zigbee
this.registerCapabilityListener('onoff.socket2', async (value) => {
  if (value) await ep2.clusters.onOff.setOn();
  else       await ep2.clusters.onOff.setOff();
});

// Zigbee → capability
ep2.clusters.onOff.on('attr.onOff', (value) => {
  this.setCapabilityValue('onoff.socket2', value).catch(this.error);
});

// Read state on startup
ep2.clusters.onOff.readAttributes(['onOff'])
  .then(({ onOff }) => this.setCapabilityValue('onoff.socket2', onOff))
  .catch(err => this.log(`Could not read initial state: ${err.message}`));
```

### Configure Reporting is rejected

The device returns `UNSUP_GENERAL_COMMAND` for all `configureReporting` requests
on all clusters. This is a known Tuya behaviour — it returns the error but still
sends unsolicited reports for on/off state changes. Simply catch and ignore
`UNSUP_GENERAL_COMMAND`; do not treat it as fatal.

---

## Power measurement

### The cluster is advertised but the attributes are inaccessible

`haElectricalMeasurement` (cluster `0x0B04`) is present in the endpoint descriptor
on both endpoints. However, **every `readAttributes` call returns an empty object
`{}`** — no error, no data. Attributes confirmed to return nothing:

- `activePower`
- `rmsVoltage`
- `rmsCurrent`
- `acPowerMultiplier`
- `acPowerDivisor`

### Root cause: Tuya firmware change

Tuya changed the TS011F firmware at version **1.0.5** (devices produced from
**Q4 2021** onwards). In the new firmware:

- Attribute reporting for power/current/voltage via `haElectricalMeasurement` is
  **completely disabled**.
- The cluster remains in the descriptor (a Tuya oversight / deliberate obfuscation).
- Power data is only available via the **Tuya proprietary cluster `0xEF00`
  (`manuSpecificTuya`)** using Tuya's binary DPS (Data Points) protocol.

Zigbee2MQTT documents this as `TS011F_plug_3` (distinct from `TS011F_plug_1` which
had working attribute reporting) and falls back to polling via DPS:
<https://www.zigbee2mqtt.io/devices/TS011F_plug_3.html>

### DPS data points for TS011F power (informational)

For anyone wanting to implement Tuya DPS power reading, the relevant data point IDs
reported by Zigbee2MQTT for the TS011F are:

| DP ID | Name | Type |
|---|---|---|
| 19 | `power` (W) | value |
| 20 | `current` (mA) | value |
| 21 | `voltage` (0.1 V) | value |
| 101 | `power` endpoint 2 | value |
| 102 | `current` endpoint 2 | value |
| 103 | `voltage` endpoint 2 | value |

DPS frames arrive as unsolicited reports from cluster `0xEF00`, attribute `0x0000`,
with a manufacturer code of `0x1002`. Implementing DPS parsing is non-trivial and
out of scope for a simple switch driver.

### Recommendation

For switch-only use: omit `measure_power` from the driver entirely. The socket
switches both outlets correctly, which is the primary use case.

For power measurement: a full Tuya DPS implementation is required, or pair the
device to Zigbee2MQTT which already handles this.

---

## Pairing

The socket does not have a dedicated pairing button. To enter pairing mode:

1. Ensure the socket is powered.
2. Press and hold **both** physical socket buttons simultaneously for ~5 seconds.
3. The LED indicators will flash rapidly to indicate pairing mode.
4. Complete the pairing within 3 minutes.

---

## Known issues

| Issue | Details |
|---|---|
| Random power-off | Some users report the socket randomly switching off. Tracked in [zigbee2mqtt/zigbee2mqtt#11648](https://github.com/Koenkk/zigbee2mqtt/issues/11648). Possibly firmware bug, possibly interference. |
| Power measurement inaccessible | Firmware ≥1.0.5 only exposes power via Tuya DPS cluster — not standard ZHA. |
| `UNSUP_GENERAL_COMMAND` on all `configureReporting` | Expected on all Tuya TS01xx devices. Non-fatal; ignore it. |

---

## Resources

- [Zigbee2MQTT TS011F\_plug\_3 device page](https://www.zigbee2mqtt.io/devices/TS011F_plug_3.html)
- [zigbee-herdsman-converters TS011F source](https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/tuya.ts)
- [Zigbee2MQTT issue: TS011F random power-off](https://github.com/Koenkk/zigbee2mqtt/issues/11648)
- [homey-zigbeedriver on GitHub](https://github.com/athombv/node-homey-zigbeedriver)
- [Tuya Zigbee DPS protocol notes (unofficial)](https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/lib/tuya.ts)
