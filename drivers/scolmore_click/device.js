'use strict';

const ZigBeeDoubleSocketDevice = require('../../lib/ZigBeeDoubleSocketDevice');

/**
 * Scolmore Click Smart+ device handler.
 *
 * Confirmed Zigbee fingerprint:
 *   manufacturerName : _TYZB01_hlla45kx
 *   modelID          : TS011F
 *
 * The TS011F has an electricalMeasurement cluster in its descriptor but
 * Tuya's firmware (≥1.0.5, post Q4-2021) does not respond to standard ZHA
 * read attribute requests for power/current/voltage — those attributes all
 * return empty. Power data is only accessible via Tuya's proprietary private
 * cluster (0xEF00 / manuSpecificTuya) using their DPS protocol, which is
 * outside the scope of this driver. On/off control on both endpoints works
 * fully via standard ZHA.
 */
class ScolmoreClickDevice extends ZigBeeDoubleSocketDevice {
  // Tuya TS011F does not support the configureReporting ZCL command.
  get SUPPORTS_REPORTING() {
    return false;
  }
}

module.exports = ScolmoreClickDevice;
