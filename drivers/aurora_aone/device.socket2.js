'use strict';

const ZigBeeDoubleSocketDevice = require('../../lib/ZigBeeDoubleSocketDevice');

class AuroraAoneSocket2Device extends ZigBeeDoubleSocketDevice {

  get ENDPOINT_ID() {
    return 2;
  }

  onDeleted() {
    this.log('Socket 2 sub-device deleted — root device handles ZCLNode cleanup');
  }
}

module.exports = AuroraAoneSocket2Device;
