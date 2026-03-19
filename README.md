# Zigbee Double Socket — Homey Pro App

Control **both sockets of your Zigbee double socket independently** from Homey Pro.

The official Homey Zigbee apps only expose a single on/off switch for double-socket
devices. This app maps each socket to its own capability so you can switch them
individually and use them in separate Flows.

---

## Supported devices

| Brand / Model | Driver | Socket 1 | Socket 2 | Power measurement | Fingerprint |
|---|---|---|---|---|---|
| **Aurora Aone AU-A1ZBDSS** | `aurora_aone` | ✅ | ✅ | ❌ firmware bug² | ✅ Confirmed |
| **Scolmore Click Smart+** | `scolmore_click` | ✅ | ✅ | ❌ Tuya firmware block¹ | ✅ Confirmed |
| **Aqara SP-EUC02** | *(not yet active)* | — | — | — | ⚠️ Unconfirmed – hardware not tested |

¹ The TS011F hardware has an `haElectricalMeasurement` cluster but Tuya firmware
≥1.0.5 (all units produced since Q4 2021) silently ignores all standard ZHA read
requests. Power data is only accessible via Tuya's proprietary `0xEF00` DPS cluster.
See [docs/SCOLMORE.md](docs/SCOLMORE.md) for full details.

² The AU-A1ZBDSS `activePower` attribute returns a fixed value (~−8073) regardless
of actual load — a firmware bug confirmed across multiple clean re-pairs. Power
measurement is omitted until a firmware fix is available and tested. See
[docs/AURORA_AONE.md](docs/AURORA_AONE.md) for full details.

---

## Getting started

### 1. Prerequisites

- [Node.js](https://nodejs.org) ≥ 18
- [Homey CLI](https://apps.developer.homey.app/the-basics/getting-started)
  ```
  npm install -g homey
  ```

### 2. Install dependencies

```bash
cd homey-zigbee-double-socket
npm install
```

### 3. Required app images

Before publishing (or passing full validation) you need to provide PNG images:

| File | Size |
|---|---|
| `assets/images/small.png` | 250 × 175 px |
| `assets/images/large.png` | 500 × 350 px |
| `assets/images/xlarge.png` | 1000 × 700 px |
| `drivers/aurora_aone/assets/images/{small,large,xlarge}.png` | same sizes |
| `drivers/scolmore_click/assets/images/{small,large,xlarge}.png` | same sizes |
| `drivers/aqara_double/assets/images/{small,large,xlarge}.png` | same sizes (required when Aqara driver is re-enabled) |

You can skip image validation during development:
```bash
homey app validate --level publish   # includes image check
homey app validate --level run       # skips images, ok for dev/run
```

### 4. Run on your Homey Pro

```bash
homey app run
```

Homey will prompt you to log in and select your Homey Pro on first run.

---

## Identifying unknown devices (Aqara)

The Scolmore Click Smart+ fingerprint has been confirmed (`_TYZB01_hlla45kx` /
`TS011F`). The Aqara SP-EUC02 is not yet in any public Zigbee device database.
To find the correct identifiers for the Aqara or any other new device:

### Option A – Zigbee2MQTT (recommended)

1. Connect a Zigbee coordinator dongle (e.g. SONOFF Zigbee 3.0 USB Dongle Plus)
   to a spare computer.
2. Install [Zigbee2MQTT](https://www.zigbee2mqtt.io/guide/installation/).
3. Set `permit_join: true` in `configuration.yaml`, put the socket in pairing mode,
   and watch the log:
   ```
   Zigbee2MQTT:info  New device joined: 0x...
     modelID: <THE VALUE YOU NEED>
     manufacturerName: <THE VALUE YOU NEED>
   ```

### Option B – Homey developer tools

1. Run the app in development mode (`homey app run`).
2. Pair the socket (it will likely fail to match a specific driver, but the
   Zigbee stack will still log the device announcement).
3. Open **Homey Developer Tools** → [developer.homey.app](https://developer.homey.app)
   → select your Homey → **Zigbee** tab.
4. Look for the newly-seen device address and note the `modelID` /
   `manufacturerName`.
5. Also look in the **App Logs** for the device announcement output — this lists
   the endpoints and clusters the device reports.

### Updating the fingerprint

Once you know the values, edit `app.json` and update the relevant driver's
`zigbee.manufacturerName` and `zigbee.productId` arrays.  Remove the
placeholder guesses so only confirmed values remain.

---

## Architecture

```
app.js                              ← Homey.App entry point
lib/
  ZigBeeDoubleSocketDevice.js       ← Base class:
                                       • Socket 1: registerCapability (onoff → ep1)
                                       • Socket 2: manual wiring via
                                         registerCapabilityListener + direct cluster
                                         calls (required — homey-zigbeedriver's
                                         registerCapability breaks on dot-notation
                                         sub-capability IDs like onoff.socket2)
drivers/
  aurora_aone/
    driver.js                       ← ZigBeeDriver subclass
    device.js                       ← Minimal subclass; all logic in base
  scolmore_click/
    driver.js
    device.js                       ← Minimal subclass; all logic in base
  aqara_double/                     ← Not active (removed from app.json);
    driver.js                          re-enable once fingerprint is confirmed
    device.js
docs/
  SCOLMORE.md                       ← Full research notes: fingerprint, endpoint
                                       map, power limitation, DPS data points,
                                       known issues
locales/
  en.json                           ← English strings
assets/
  icon.svg
  capabilities/socket.svg
```

### Adding a new double-socket device

1. Copy `drivers/scolmore_click/` to `drivers/my_new_device/`.
2. Edit `driver.js` JSDoc to document the device identifiers.
3. In `app.json`:
   - Add a new entry in the `drivers` array.
   - Set `zigbee.manufacturerName` and `zigbee.productId` to the correct values.
   - List the capabilities the device supports.
4. If it has power measurement, implement `onSocketsInit` in `device.js` —
   this is an optional hook in `ZigBeeDoubleSocketDevice` called after both
   endpoints are initialised. Register any additional cluster listeners there.

---

## Zigbee cluster reference

| Decimal | Hex | Name |
|---|---|---|
| 0 | 0x0000 | genBasic |
| 3 | 0x0003 | genIdentify |
| 4 | 0x0004 | genGroups |
| 5 | 0x0005 | genScenes |
| 6 | 0x0006 | genOnOff |
| 8 | 0x0008 | genLevelCtrl |
| 2820 | 0x0B04 | haElectricalMeasurement |
| 57345 | 0xE001 | manuSpecificTuya |
| 64704 | 0xFCC0 | manuSpecificLumi (Aqara) |

---

## Homey SDK resources

- [Apps SDK Documentation](https://apps.developer.homey.app)
- [homey-zigbeedriver README](https://github.com/athombv/node-homey-zigbeedriver)
- [zigbee-clusters README](https://github.com/athombv/node-zigbee-clusters)
- [Homey Developer Tools](https://developer.homey.app)

---

## Contributing

Pull requests and device fingerprint confirmations welcome!
