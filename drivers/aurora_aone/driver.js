'use strict';

const ZigBeeDoubleSocketDriver = require('../../lib/ZigBeeDoubleSocketDriver');
const AuroraAoneDevice = require('./device');
const AuroraAoneSocket2Device = require('./device.socket2');

class AuroraAoneDriver extends ZigBeeDoubleSocketDriver {

  onMapDeviceClass(device) {
    if (device.getData().subDeviceId === 'socket2') {
      return AuroraAoneSocket2Device;
    }
    return AuroraAoneDevice;
  }
}

module.exports = AuroraAoneDriver;
