'use strict';

const ZigBeeDoubleSocketDriver = require('../../lib/ZigBeeDoubleSocketDriver');

/**
 * Aqara double socket driver.
 *
 * ⚠  MODEL IDENTIFICATION REQUIRED  ⚠
 * ─────────────────────────────────────────────────────────────────────────
 * The Aqara SP-EUC02 is not yet in any public Zigbee device database as of
 * early 2026. The identifiers in app.json are educated guesses based on:
 *
 *  • All Aqara/Lumi devices use `lumi.*`  modelIDs
 *  • Manufacturer string is typically "LUMI" (not "Aqara")
 *  • Dual-socket Lumi precedent: lumi.relay.c2acn01 (LLKZMK11LM)
 *
 * To find your device's actual identifiers:
 * 1. Pair to Zigbee2MQTT in debug mode and look for:
 *      "modelID"          → productId[] in app.json
 *      "manufacturerName" → manufacturerName[] in app.json
 *
 * 2. Add the confirmed strings to app.json and remove the placeholder guesses.
 *
 * Known Aqara dual-channel identifiers to check:
 *   lumi.plug.maeu02      (if it follows single-socket EU naming pattern)
 *   lumi.relay.c2acn01    (LLKZMK11LM relay – different form factor)
 *   lumi.plug.sp_euc02    (speculative)
 * ─────────────────────────────────────────────────────────────────────────
 */
class AqaraDoubleDriver extends ZigBeeDoubleSocketDriver {}

module.exports = AqaraDoubleDriver;
