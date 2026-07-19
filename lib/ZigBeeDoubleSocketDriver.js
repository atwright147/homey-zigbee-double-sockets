'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZigBeeDoubleSocketDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
  }

}

module.exports = ZigBeeDoubleSocketDriver;
