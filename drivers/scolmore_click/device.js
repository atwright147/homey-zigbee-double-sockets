'use strict';

const ZigBeeDoubleSocketDevice = require('../../lib/ZigBeeDoubleSocketDevice');

class ScolmoreClickDevice extends ZigBeeDoubleSocketDevice {
  get SUPPORTS_REPORTING() {
    return false;
  }
}

module.exports = ScolmoreClickDevice;
