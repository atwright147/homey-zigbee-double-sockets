'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class ZigBeeDoubleSocketDevice extends ZigBeeDevice {

  get ENDPOINT_ID() {
    return 1;
  }

  get SUPPORTS_REPORTING() {
    return true;
  }

  async onNodeInit({ zclNode }) {
    const ep = zclNode.endpoints[this.ENDPOINT_ID];
    if (!ep) {
      this.error(`Socket endpoint (${this.ENDPOINT_ID}) NOT FOUND`);
      return;
    }

    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      endpoint: this.ENDPOINT_ID,
      set: (value) => (value ? 'setOn' : 'setOff'),
      get: 'onOff',
      report: 'onOff',
      getOpts: { getOnStart: true },
    });

    if (this.SUPPORTS_REPORTING) {
      await this.configureAttributeReporting([{
        endpointId: this.ENDPOINT_ID,
        cluster: CLUSTER.ON_OFF,
        attributeName: 'onOff',
        minInterval: 0,
        maxInterval: 300,
        minChange: 1,
      }]).catch((err) => {
        this.error(`configureAttributeReporting onOff: ${err.message}`);
      });
    }

    if (typeof this.onSocketsInit === 'function') {
      await this.onSocketsInit({ zclNode });
    }
  }
}

module.exports = ZigBeeDoubleSocketDevice;
