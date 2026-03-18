'use strict';

const Homey = require('homey');

class ZigBeeDoubleSocketApp extends Homey.App {
  async onInit() {
    this.log('Zigbee Double Socket app has been initialized');
  }
}

module.exports = ZigBeeDoubleSocketApp;
