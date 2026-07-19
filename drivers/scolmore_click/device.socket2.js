'use strict';

const ZigBeeDoubleSocketDevice = require('../../lib/ZigBeeDoubleSocketDevice');

class ScolmoreClickSocket2Device extends ZigBeeDoubleSocketDevice {

  get ENDPOINT_ID() {
    return 2;
  }

  get SUPPORTS_REPORTING() {
    return false;
  }

  onDeleted() {
    this.log('Socket 2 sub-device deleted — root device handles ZCLNode cleanup');
  }
}

module.exports = ScolmoreClickSocket2Device;
