# AGENTS.md — Project Context for AI Agents

## Project: `com.zigbee-double-socket`

Homey Pro app that exposes both sockets of Zigbee double-socket outlets as independent `onoff` capabilities. Official Homey Zigbee apps only expose one switch per device — this app maps both sockets individually.

**SDK 3, zigbee-clusters ^2.10.0, homey-zigbeedriver ^2.2.0, Node ≥18, Homey ≥5.0.0**

---

## Architecture

### Class Hierarchy

```
Homey.App
  └── ZigBeeDoubleSocketApp (app.js)              ← minimal bootstrapper

ZigBeeDriver
  └── ZigBeeDoubleSocketDriver (lib/ZigBeeDoubleSocketDriver.js)
        ├── AuroraAoneDriver                       ← no overrides
        ├── ScolmoreClickDriver                    ← no overrides
        └── AqaraDoubleDriver                      ← no overrides

ZigBeeDevice
  └── ZigBeeDoubleSocketDevice (lib/ZigBeeDoubleSocketDevice.js)
        ├── AuroraAoneDevice                       ← no overrides
        ├── ScolmoreClickDevice                    ← SUPPORTS_REPORTING = false
        └── AqaraDoubleDevice                      ← no overrides
```

### Driver Registration (.homeycompose/app.json)

`.homeycompose/app.json` has **no `drivers[]` array** — Homey Compose auto-discovers drivers from `drivers/*/` subdirectories. Every folder under `drivers/` becomes a driver entry. All three (aurora_aone, scolmore_click, aqara_double) are **active** in the generated `app.json`.

### Flow Card Prefixing

Driver IDs use underscores (`aurora_aone`). Flow card IDs use hyphens (`aurora-aone`). The prefix mapping: `driver.manifest.id.replace(/_/g, '-')`.

---

## Code Flow

### Boot: app.js → Driver onInit → Device onNodeInit

1. `app.js:onInit()` — logs init
2. `ZigBeeDoubleSocketDriver:onInit()` — registers all Flow cards (triggers, conditions, actions) for both sockets. Uses `_cardPrefix` to derive card IDs from the driver manifest ID.
3. `ZigBeeDoubleSocketDevice:onNodeInit({ zclNode })` — the core:
   - **Socket 1** (`onoff` → EP 1): `registerCapability('onoff', CLUSTER.ON_OFF, {...})` with `reportParser` that also fires `this.driver.triggerSocket(this, 1, value)` for Flow triggers.
   - **Socket 2** (`onoff.socket2` → EP 2): Manual wiring via `registerCapabilityListener` (cap→zigbee) + `ep2.clusters.onOff.on('attr.onOff', ...)` (zigbee→cap) + startup `readAttributes`.
   - **Attribute reporting**: `configureAttributeReporting` for both EP1 and EP2 onOff attributes (skipped if `SUPPORTS_REPORTING` is false).
   - **Hook**: `onSocketsInit({ zclNode })` called at end for subclasses to add power measurement etc.

### The `onoff.socket2` Dot-Notation Bug

`homey-zigbeedriver`'s `registerCapability()` looks up built-in defaults by capability ID. It knows `onoff` (built-in). It does NOT know `onoff.socket2` — the set handler ends up `undefined`, causing `TypeError: set_parser_is_not_a_function` at runtime.

**Fix used**: Bypass `registerCapability` entirely for `onoff.socket2`:
```js
this.registerCapabilityListener('onoff.socket2', async (value) => {
  if (value) await ep2.clusters.onOff.setOn();
  else       await ep2.clusters.onOff.setOff();
});
ep2.clusters.onOff.on('attr.onOff', (value) => {
  this.setCapabilityValue('onoff.socket2', value).catch(this.error);
  this.driver.triggerSocket(this, 2, value);
});
```

### Flow Trigger Propagation

When device reports state change → `ZigBeeDoubleSocketDevice` → `this.driver.triggerSocket(this, socketNum, value)` → `ZigBeeDoubleSocketDriver.triggerSocket()` → `card.trigger(device, {}, {})`.

---

## Aurora Aone (AU-A1ZBDSS / DoubleSocket50AU)

**Fingerprint**: `manufacturerName`: `["Aurora Lighting", "Aurora", "AURORA", "Aurora Limited"]`, `productId`: `["DoubleSocket50AU", "AU-A1ZBDSS"]`

**Standard ZHA 3.0** (not Tuya).

### Endpoints

| EP | Purpose | Clusters | Bindings |
|----|---------|----------|----------|
| 1 | Socket 1 (left) | basic(0), identify(3), groups(4), scenes(5), onOff(6), haElectricalMeasurement(2820) | onOff(6) |
| 2 | Socket 2 (right) | same as EP1 | onOff(6) |
| 3 | Backlight LED | basic(0), identify(3), onOff(6), levelControl(8) | none |

### Known Issues

- **`configureAttributeReporting` returns `UNSUP_GENERAL_COMMAND`** — non-fatal, device pushes unsolicited reports anyway. `SUPPORTS_REPORTING` is `true` (default), so the error is caught and logged by the `.catch()` in the base class.
- **Power measurement broken**: `haElectricalMeasurement.activePower` returns fixed ~-8073 regardless of load. Not exposed. Firmware bug — some Z2M users report working values. OTA updates may fix.
- **ManufacturerName variants**: 4 known strings (see above). Missing any one causes Homey to fail matching.
- **Backlight (EP3)**: Intentionally uncontrolled. LED tracks socket 1 state in hardware.

### Pairing: Press and hold button ~5s until LED flashes rapidly.

---

## Scolmore Click Smart+ (TS011F)

**Fingerprint**: `manufacturerName`: `["_TYZB01_hlla45kx"]`, `productId`: `["TS011F"]`

**Tuya-based ZHA 3.0** (Tuya TS011F reference design).

### Endpoints

| EP | Purpose | Clusters | Bindings |
|----|---------|----------|----------|
| 1 | Socket 1 (left/top) | basic(0), groups(4), scenes(5), onOff(6) | onOff(6) |
| 2 | Socket 2 (right/bottom) | same as EP1 | onOff(6) |

Note: `haElectricalMeasurement(0x0B04)` is in the descriptor but non-functional (see below).

### The Only Subclass Override

`ScolmoreClickDevice` sets `SUPPORTS_REPORTING = false` (getter override), which skips the `configureAttributeReporting` ZCL call entirely. Tuya devices reject it with `UNSUP_GENERAL_COMMAND` — catching and logging is insufficient for all environments, so skipping entirely is more reliable.

### Known Issues

- **`configureReporting` rejected**: Tuya firmware returns `UNSUP_GENERAL_COMMAND` for all clusters. Base class handles with `catch`. Scolmore also overrides `SUPPORTS_REPORTING = false` to skip the call.
- **Power measurement blocked**: `haElectricalMeasurement` is in the descriptor but `readAttributes` returns empty `{}`. Tuya firmware ≥1.0.5 (Q4 2021+) disabled standard ZHA reads. Power data only via Tuya proprietary cluster `0xEF00` DPS protocol.
- **DPS data points** (informational, not implemented): DP 19=power(W), 20=current(mA), 21=voltage(0.1V), 101/102/103=same for EP2.
- **Random power-off**: Tracked in [Z2M#11648](https://github.com/Koenkk/zigbee2mqtt/issues/11648) — possibly firmware bug or interference.
- **No identify cluster** (unlike Aurora).

### Pairing: Press and hold BOTH socket buttons simultaneously ~5s until LEDs flash.

---

## Aqara Double (SP-EUC02) — Active but Unconfirmed

The driver is **active** (auto-discovered from `drivers/aqara_double/` folder). Fingerprint is **speculative**:
- `manufacturerName`: `"LUMI"` (common Aqara prefix, may be wrong for this model)
- `productId`: `"lumi.plug.sp_euc02"` (unconfirmed — no public Zigbee database entry)

If someone pairs this device, Homey will attempt to match with these values. If incorrect, the device shows as "Zigbee Device" in the generic app. See README.md for identification procedure.

---

## Adding a New Device

1. Copy `drivers/scolmore_click/` → `drivers/new_device/`
2. Update `driver.compose.json`:
   - Set correct `manufacturerName` / `productId`
   - Adjust endpoint clusters and bindings
   - Provide learnmode image/instructions
3. Update `device.js`:
   - Override `SUPPORTS_REPORTING` if Tuya-based (=false) or standard (=true, default)
   - Implement `onSocketsInit({ zclNode })` for power measurement or extra clusters
4. Update `driver.flow.compose.json` for flow cards
5. Add locale strings to `locales/en.json`
6. Provide asset images (required for publish validation)
7. Create `docs/DEVICE.md` with research notes

No changes needed to `app.json` — Homey Compose auto-discovers.

---

## Key Dependencies

- **homey-zigbeedriver** ^2.2.0 — Homey's Zigbee driver SDK. Provides `ZigBeeDriver`, `ZigBeeDevice`, and `registerCapability` / `configureAttributeReporting`.
- **zigbee-clusters** ^2.10.0 — Cluster definitions (`CLUSTER.ON_OFF`, etc.) and endpoint/cluster access.
- Both are Athom (Homey vendor) packages.

---

## Files Inventory

```
.homeycompose/app.json                    ← source for app.json (no drivers[] — auto-discovered)
app.json                                  ← generated (do not edit directly)
lib/
  ZigBeeDoubleSocketDriver.js             ← base driver (flow card registration)
  ZigBeeDoubleSocketDevice.js             ← base device (socket 1 & 2 wiring)
drivers/
  aurora_aone/                            ← Aurora Aone (standard ZHA)
    driver.js / device.js / driver.compose.json / driver.flow.compose.json
  scolmore_click/                         ← Scolmore Click (Tuya TS011F)
    driver.js / device.js / driver.compose.json / driver.flow.compose.json
  aqara_double/                           ← Aqara SP-EUC02 (unconfirmed fingerprint)
    driver.js / device.js / driver.compose.json / driver.flow.compose.json
docs/
  AURORA_AONE.md                          ← device research notes
  SCOLMORE.md                             ← device research notes
AGENTS.md                                 ← this file
```

---

## Next / Roadmap

1. **Confirm Aqara fingerprint** — needs a physical device paired to Z2M or Homey dev tools.
2. **Power measurement** — implement Tuya DPS parsing for Scolmore (cluster 0xEF00, DP 19-21, 101-103) in `onSocketsInit`.
3. **Aurora backlight control** — expose EP3 `genOnOff` / `genLevelCtrl` as optional capabilities.
4. **OTA support** — Aurora Aone has OTA cluster available; could add firmware update flow.
