'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * Scolmore Click Smart+ double socket driver.
 *
 * ⚠  IMPORTANT – MODEL IDENTIFICATION REQUIRED  ⚠
 * ─────────────────────────────────────────────────────────────────────────
 * Scolmore Click Smart+ devices are not yet in any public Zigbee device
 * database. The manufacturerName and productId values in app.json are
 * EDUCATED GUESSES based on other UK smart sockets from the same era.
 *
 * To find the ACTUAL values your socket reports:
 *
 * 1. Pair the socket to Zigbee2MQTT (zigbee2mqtt.io) in debug mode, or
 * 2. Use a Zigbee sniffer (TI CC2531 / sonoff Zigbee dongle) and inspect
 *    the Device Announce message for:
 *      - "modelID"          → this goes in productId[] in app.json
 *      - "manufacturerName" → this goes in manufacturerName[] in app.json
 *
 * Once identified, update app.json and remove the extra guesses.
 * Please also consider submitting the fingerprint via a GitHub issue!
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Common Tuya-based UK double socket identifiers to try:
 *   TS0002 / _TZ3000_...  (2-gang relay)
 *   TS0012 / _TZ3000_...  (2-gang switch)
 *   SM-SO306EZ-10         (reported by zigbee.blakadder.com)
 */
class ScolmoreClickDriver extends ZigBeeDriver {}

module.exports = ScolmoreClickDriver;
