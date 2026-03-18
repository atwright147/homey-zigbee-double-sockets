'use strict';

const ZigBeeDoubleSocketDevice = require('../../lib/ZigBeeDoubleSocketDevice');

/**
 * Aqara double socket device handler.
 *
 * Aqara (Lumi) devices sometimes behave differently from standard ZHA:
 *
 * 1. They have a proprietary "manuSpecificLumi" cluster (0xFCC0) that
 *    carries extra attributes (child lock, LED indicator mode, etc.).
 *    If you want to control those, add a CLUSTER import and listen on
 *    endpoint.clusters.manuSpecificLumi.
 *
 * 2. State sync: some Lumi sockets do NOT send on/off reports unless you
 *    explicitly bind their genOnOff cluster.  The 'bindings' in app.json
 *    tells Homey to do this automatically at pair time.
 *
 * 3. If the device uses endpoints 11 and 12 instead of 1 and 2
 *    (like some Lumi relays), override the endpoint getters:
 *
 *      get SOCKET_ONE_ENDPOINT() { return 1; }   // adjust as needed
 *      get SOCKET_TWO_ENDPOINT() { return 2; }
 *
 * ── Notes for SP-EUC02 ─────────────────────────────────────────────
 * Once you pair the device and see printNode() output in the Homey
 * developer console, verify:
 *  - Which endpoint IDs carry genOnOff
 *  - Whether haElectricalMeasurement is present (power readings)
 *  - Whether there is a manuSpecificLumi cluster worth mapping
 *
 * If power measurement is available, model this file after
 * drivers/aurora_aone/device.js.
 */
class AqaraDoubleDevice extends ZigBeeDoubleSocketDevice {
  // Inherits dual on/off from ZigBeeDoubleSocketDevice.
  // Add Aqara-specific quirks here once the exact model is confirmed.
}

module.exports = AqaraDoubleDevice;
