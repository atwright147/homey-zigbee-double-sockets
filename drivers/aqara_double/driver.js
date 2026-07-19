'use strict';

const ZigBeeDoubleSocketDriver = require('../../lib/ZigBeeDoubleSocketDriver');
const AqaraDoubleDevice = require('./device');
const AqaraDoubleSocket2Device = require('./device.socket2');

class AqaraDoubleDriver extends ZigBeeDoubleSocketDriver {

  onMapDeviceClass(device) {
    if (device.getData().subDeviceId === 'socket2') {
      return AqaraDoubleSocket2Device;
    }
    return AqaraDoubleDevice;
  }
}

module.exports = AqaraDoubleDriver;
