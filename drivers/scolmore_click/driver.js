'use strict';

const ZigBeeDoubleSocketDriver = require('../../lib/ZigBeeDoubleSocketDriver');

/**
 * Scolmore Click Smart+ double socket driver.
 *
 * Confirmed Zigbee fingerprint:
 *   manufacturerName : _TYZB01_hlla45kx
 *   modelID          : TS011F
 *
 * Power measurement is not supported — Tuya firmware blocks standard ZHA
 * attribute reads on the electricalMeasurement cluster.
 */
class ScolmoreClickDriver extends ZigBeeDoubleSocketDriver {}

module.exports = ScolmoreClickDriver;
