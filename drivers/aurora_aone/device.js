'use strict';

const { CLUSTER } = require('zigbee-clusters');
const ZigBeeDoubleSocketDevice = require('../../lib/ZigBeeDoubleSocketDevice');

/**
 * Aurora Aone AU-A1ZBDSS device handler.
 *
 * Extends the base double-socket class to add:
 *  - measure_power        (socket 1 – endpoint 1)
 *  - measure_power.socket2 (socket 2 – endpoint 2)
 *
 * The haElectricalMeasurement cluster returns:
 *  activePower (attribute 0x050B) in units of (acPowerMultiplier / acPowerDivisor) W.
 * These are read once on first init and cached in device store.
 *
 * Endpoint 3 (backlight LED) is intentionally left uncontrolled for now
 * but the infrastructure is there to add a 'dim.backlight' capability later.
 */
class AuroraAoneDevice extends ZigBeeDoubleSocketDevice {

  // ── Subclass hook – called by base class after on/off setup ─────────────

  async onSocketsInit({ zclNode }) {
    await this._initPowerMeasurement(zclNode, this.SOCKET_ONE_ENDPOINT, 'measure_power');
    await this._initPowerMeasurement(zclNode, this.SOCKET_TWO_ENDPOINT, 'measure_power.socket2');
  }

  // ── Power measurement ────────────────────────────────────────────────────

  /**
   * Initialise power measurement for one endpoint.
   *
   * @param {object} zclNode     - the ZCL node passed by homey-zigbeedriver
   * @param {number} endpointId  - Zigbee endpoint number (1 or 2)
   * @param {string} capability  - Homey capability id ('measure_power' or 'measure_power.socket2')
   */
  async _initPowerMeasurement(zclNode, endpointId, capability) {
    const endpoint = zclNode.endpoints[endpointId];

    if (!endpoint || !endpoint.clusters.electricalMeasurement) {
      this.log(`[aurora_aone] Endpoint ${endpointId} has no electricalMeasurement cluster – skipping power`);
      return;
    }

    // ── Read and cache the AC power calibration coefficients ── //
    // These rarely change; store them to survive restarts without
    // a Zigbee read on every boot.
    const calibStoreKey = `powerCalib_ep${endpointId}`;
    let calib = this.getStoreValue(calibStoreKey);

    if (!calib) {
      try {
        const attrs = await endpoint.clusters.electricalMeasurement
          .readAttributes(['acPowerMultiplier', 'acPowerDivisor']);

        calib = {
          mult: (attrs.acPowerMultiplier != null) ? attrs.acPowerMultiplier : 1,
          div:  (attrs.acPowerDivisor  != null)  ? attrs.acPowerDivisor  : 1,
        };
        // Protect against zero divisor
        if (calib.div === 0) calib.div = 1;

        await this.setStoreValue(calibStoreKey, calib);
        this.log(`[aurora_aone] ep${endpointId} power calib: ×${calib.mult} / ${calib.div}`);
      } catch (err) {
        this.log(`[aurora_aone] Could not read power calib for ep${endpointId}: ${err.message}`);
        calib = { mult: 1, div: 1 };
        await this.setStoreValue(calibStoreKey, calib);
      }
    }

    // ── Subscribe to activePower attribute reports ── //
    endpoint.clusters.electricalMeasurement.on('attr.activePower', (rawValue) => {
      const { mult, div } = this.getStoreValue(calibStoreKey) || { mult: 1, div: 1 };
      const watts = Math.max(0, (rawValue * mult) / div);
      this.setCapabilityValue(capability, parseFloat(watts.toFixed(2))).catch(this.error);
    });

    // ── Configure attribute reporting on the device ── //
    await this.configureAttributeReporting([
      {
        endpointId,
        cluster: CLUSTER.ELECTRICAL_MEASUREMENT,
        attributeName: 'activePower',
        minInterval: 5,
        maxInterval: 300,
        minChange: 1,         // report when power changes by ≥1 raw unit
      },
    ]).catch(this.error);

    // ── Poll current power value immediately on start ── //
    try {
      const { activePower } = await endpoint.clusters.electricalMeasurement
        .readAttributes(['activePower']);

      if (activePower != null) {
        const { mult, div } = calib;
        const watts = Math.max(0, (activePower * mult) / div);
        await this.setCapabilityValue(capability, parseFloat(watts.toFixed(2)));
      }
    } catch (err) {
      this.log(`[aurora_aone] Could not read initial activePower for ep${endpointId}: ${err.message}`);
    }
  }
}

module.exports = AuroraAoneDevice;
