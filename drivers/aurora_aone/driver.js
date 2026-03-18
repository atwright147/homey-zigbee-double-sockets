'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * Aurora Aone AU-A1ZBDSS driver.
 *
 * Zigbee identifiers (confirmed via zigbee-herdsman-converters):
 *   manufacturerName : Aurora Lighting
 *   modelID          : DoubleSocket50AU
 *
 * Endpoints:
 *   1 – left socket  (genOnOff + haElectricalMeasurement)
 *   2 – right socket (genOnOff + haElectricalMeasurement)
 *   3 – backlight LED (genOnOff + genLevelCtrl)
 */
class AuroraAoneDriver extends ZigBeeDriver {}

module.exports = AuroraAoneDriver;
