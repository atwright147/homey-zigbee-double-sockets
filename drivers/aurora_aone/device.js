'use strict';

const ZigBeeDoubleSocketDevice = require('../../lib/ZigBeeDoubleSocketDevice');

/**
 * Aurora Aone AU-A1ZBDSS device handler.
 *
 * The AU-A1ZBDSS electricalMeasurement cluster returns a fixed ~-8050 value
 * regardless of load (firmware bug). Power measurement is not exposed.
 * Endpoint 3 (backlight LED) is intentionally left uncontrolled.
 */
class AuroraAoneDevice extends ZigBeeDoubleSocketDevice {}

module.exports = AuroraAoneDevice;
