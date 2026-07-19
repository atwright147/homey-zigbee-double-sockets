'use strict';

const ZigBeeDoubleSocketDriver = require('../../lib/ZigBeeDoubleSocketDriver');
const ScolmoreClickDevice = require('./device');
const ScolmoreClickSocket2Device = require('./device.socket2');

class ScolmoreClickDriver extends ZigBeeDoubleSocketDriver {

  onMapDeviceClass(device) {
    if (device.getData().subDeviceId === 'socket2') {
      return ScolmoreClickSocket2Device;
    }
    return ScolmoreClickDevice;
  }
}

module.exports = ScolmoreClickDriver;
