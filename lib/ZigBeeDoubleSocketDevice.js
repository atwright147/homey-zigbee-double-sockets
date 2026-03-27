'use strict';

/**
 * ZigBeeDoubleSocketDevice – base class for all Zigbee double socket drivers.
 *
 * Handles:
 *  - onoff        → endpoint SOCKET_ONE_ENDPOINT  (socket 1)
 *  - onoff.socket2 → endpoint SOCKET_TWO_ENDPOINT (socket 2)
 *  - Attribute reporting for both on/off clusters
 *  - An optional onSocketsInit({ zclNode }) hook for subclasses
 *    (e.g. for device-specific cluster setup)
 *
 * Subclasses can override SOCKET_ONE_ENDPOINT / SOCKET_TWO_ENDPOINT getters
 * when a device uses non-standard endpoint numbering.
 */

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class ZigBeeDoubleSocketDevice extends ZigBeeDevice {

  // ── Endpoint mapping ────────────────────────────────────────────────────
  // Override in a subclass if your device uses different endpoint numbers.

  get SOCKET_ONE_ENDPOINT() {
    return 1;
  }

  get SOCKET_TWO_ENDPOINT() {
    return 2;
  }

  get SUPPORTS_REPORTING() {
    return true;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  async onNodeInit({ zclNode }) {
    const ep1 = zclNode.endpoints[this.SOCKET_ONE_ENDPOINT];
    const ep2 = zclNode.endpoints[this.SOCKET_TWO_ENDPOINT];

    if (!ep1) {
      this.error(`Socket 1 endpoint (${this.SOCKET_ONE_ENDPOINT}) NOT FOUND`);
      return;
    }
    if (!ep2) this.error(`Socket 2 endpoint (${this.SOCKET_TWO_ENDPOINT}) NOT FOUND`);

    // ── Socket 1 — registerCapability works for built-in capability IDs ──
    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      endpoint: this.SOCKET_ONE_ENDPOINT,
      set: (value) => (value ? 'setOn' : 'setOff'),
      get: 'onOff',
      report: 'onOff',
      reportParser: (value) => {
        // Fire the Socket 1 flow trigger card
        this.driver.triggerSocket(this, 1, value);
        return value;
      },
      getOpts: { getOnStart: true },
    });

    // ── Socket 2 — manual wiring required ────────────────────────────────
    // homey-zigbeedriver's registerCapability fails silently for sub-capability
    // IDs like 'onoff.socket2' because it can't find a matching built-in
    // default, leaving the set handler as undefined → set_parser_is_not_a_function.
    // Direct cluster calls + registerCapabilityListener avoid this entirely.
    if (ep2 && ep2.clusters.onOff) {
      // Capability → Zigbee
      this.registerCapabilityListener('onoff.socket2', async (value) => {
        if (value) {
          await ep2.clusters.onOff.setOn();
        } else {
          await ep2.clusters.onOff.setOff();
        }
      });

      // Zigbee → capability (unsolicited reports)
      ep2.clusters.onOff.on('attr.onOff', (value) => {
        this.setCapabilityValue('onoff.socket2', value).catch(this.error);

        // Fire the matching flow trigger card via the driver
        this.driver.triggerSocket(this, 2, value);
      });

      // Read current state on startup
      try {
        const { onOff } = await ep2.clusters.onOff.readAttributes(['onOff']);
        await this.setCapabilityValue('onoff.socket2', onOff);
      } catch (err) {
        this.log(`Could not read initial onOff ep${this.SOCKET_TWO_ENDPOINT}: ${err.message}`);
      }
    }

    // ── Configure attribute reporting (skip for devices that don't support it) ──
    if (this.SUPPORTS_REPORTING) {
      await this.configureAttributeReporting([
        {
          endpointId: this.SOCKET_ONE_ENDPOINT,
          cluster: CLUSTER.ON_OFF,
          attributeName: 'onOff',
          minInterval: 0,
          maxInterval: 300,
          minChange: 1,
        },
        {
          endpointId: this.SOCKET_TWO_ENDPOINT,
          cluster: CLUSTER.ON_OFF,
          attributeName: 'onOff',
          minInterval: 0,
          maxInterval: 300,
          minChange: 1,
        },
      ]).catch((err) => {
        this.error(`configureAttributeReporting onOff: ${err.message}`);
      });
    }

    // ── Optional subclass hook (power measurement, etc.) ─────────────────
    if (typeof this.onSocketsInit === 'function') {
      await this.onSocketsInit({ zclNode });
    }
  }
}

module.exports = ZigBeeDoubleSocketDevice;
