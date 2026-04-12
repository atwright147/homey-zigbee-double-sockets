'use strict';

const ZigBeeDoubleSocketDevice = require('../../lib/ZigBeeDoubleSocketDevice');

/**
 * Aurora Aone AU-A1ZBDSS device handler.
 *
 * The AU-A1ZBDSS electricalMeasurement cluster returns a fixed ~-8050 value
 * regardless of load (firmware bug). Power measurement is not exposed.
 * Endpoint 3 exposes the backlight LED level control.
 */
class AuroraAoneDevice extends ZigBeeDoubleSocketDevice {

  async onSocketsInit({ zclNode }) {
    if (!this.hasCapability('dim.led')) {
      return;
    }

    const ep3 = zclNode.endpoints[3];
    const levelControl = ep3 && ep3.clusters && ep3.clusters.levelControl;
    const ledOnOff = ep3 && ep3.clusters && ep3.clusters.onOff;

    if (!levelControl) {
      this.log('Endpoint 3 levelControl not available, LED brightness disabled');
      return;
    }

    this.log('Aurora LED control initialized on endpoint 3');

    const toZigbeeLevel = (value) => {
      const normalized = Math.max(0, Math.min(1, value));
      if (normalized === 0) return 0;
      return Math.max(1, Math.round(normalized * 254));
    };

    const toHomeyDim = (level) => {
      const clamped = Math.max(0, Math.min(254, level));
      return clamped / 254;
    };

    const syncDimFromLevel = async (level) => {
      if (typeof level !== 'number') return;
      await this.setCapabilityValue('dim.led', toHomeyDim(level));
    };

    this.registerCapabilityListener('dim.led', async (value) => {
      const level = toZigbeeLevel(value);
      const commandArgs = { level, transitionTime: 0 };
      const commandOpts = { waitForResponse: false, disableDefaultResponse: true };

      this.log(`LED brightness request received: dim=${value}, level=${level}`);

      // Some firmware only applies level changes when the LED endpoint is on.
      if (ledOnOff && typeof ledOnOff.setOn === 'function' && level > 0) {
        try {
          await ledOnOff.setOn(undefined, commandOpts);
          this.log('Sent endpoint 3 onOff.setOn');
        } catch (err) {
          this.log(`Could not set LED endpoint on before level change: ${err.message}`);
        }
      }

      try {
        // Send mandatory level command first.
        await levelControl.moveToLevel(commandArgs, commandOpts);
        this.log('Sent endpoint 3 levelControl.moveToLevel');
      } catch (moveErr) {
        this.log(`moveToLevel send failed: ${moveErr.message}`);
      }

      // Some firmware applies changes only for the withOnOff variant.
      if (typeof levelControl.moveToLevelWithOnOff === 'function') {
        try {
          await levelControl.moveToLevelWithOnOff(commandArgs, commandOpts);
          this.log('Sent endpoint 3 levelControl.moveToLevelWithOnOff');
        } catch (err) {
          this.log(`moveToLevelWithOnOff send failed: ${err.message}`);
        }
      }

      // Fallback path for devices that accept level writes but ignore move commands.
      try {
        await levelControl.writeAttributes({ currentLevel: level }, commandOpts);
        this.log('Sent endpoint 3 levelControl.writeAttributes(currentLevel)');
      } catch (err) {
        this.log(`LED currentLevel write fallback failed: ${err.message}`);
      }

      if (ledOnOff && typeof ledOnOff.setOff === 'function' && level === 0) {
        try {
          await ledOnOff.setOff(undefined, commandOpts);
          this.log('Sent endpoint 3 onOff.setOff');
        } catch (err) {
          this.log(`Could not set LED endpoint off: ${err.message}`);
        }
      }

      // Keep UI state responsive even on firmware that does not respond to level reads.
      await this.setCapabilityValue('dim.led', value);
      this.log('Updated dim.led capability value locally');
    });

    levelControl.on('attr.currentLevel', (level) => {
      this.log(`Received endpoint 3 attr.currentLevel=${level}`);
      syncDimFromLevel(level).catch(this.error);
    });

    // Skip startup read: many units time out on levelControl reads.
  }
}

module.exports = AuroraAoneDevice;
