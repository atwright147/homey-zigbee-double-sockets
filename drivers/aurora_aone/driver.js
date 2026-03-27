'use strict';

const ZigBeeDoubleSocketDriver = require('../../lib/ZigBeeDoubleSocketDriver');

/**
 * Aurora Aone AU-A1ZBDSS driver.
 *
 * Zigbee identifiers (confirmed via zigbee-herdsman-converters):
 *   manufacturerName : "Aurora Lighting"  (some firmware may report "Aurora" or "AURORA")
 *   modelID          : "DoubleSocket50AU" (some firmware may report "AU-A1ZBDSS")
 *
 * If the device shows as "Zigbee Device" in Homey instead of this driver's name,
 * it was claimed by Homey's built-in Zigbee app. Delete the device and re-pair
 * through this app.
 *
 * Endpoints:
 *   1 – left socket  (genOnOff + haElectricalMeasurement)
 *   2 – right socket (genOnOff + haElectricalMeasurement)
 *   3 – backlight LED (genOnOff + genLevelCtrl)
 */
class AuroraAoneDriver extends ZigBeeDoubleSocketDriver {}

module.exports = AuroraAoneDriver;
