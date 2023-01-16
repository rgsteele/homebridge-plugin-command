const { execSync } = require('child_process');

module.exports = function (api) {
  api.registerAccessory("homebridge-plugin-command", "Command Accessory", CommandAccessoryPlugin);
}

class CommandAccessoryPlugin {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.api = api;
    this.currentState = false;

    this.log.debug(`Command Accessory Plugin: ${this.config.name} Loaded`);

    // your accessory must have an AccessoryInformation service
    this.informationService = new this.api.hap.Service.AccessoryInformation()
      .setCharacteristic(this.api.hap.Characteristic.Manufacturer, "adyanth")
      .setCharacteristic(this.api.hap.Characteristic.SerialNumber, "#007")
      .setCharacteristic(this.api.hap.Characteristic.Model, config["name"]);

    // create a new "Switch" service
    this.switchService = new this.api.hap.Service.Switch(this.name);

    // link methods used when getting or setting the state of the service 
    this.switchService.getCharacteristic(this.api.hap.Characteristic.On)
      .onGet(this.getState.bind(this))   // bind to getStateHandler method below
      .onSet(this.setState.bind(this));  // bind to setStateHandler method below
  }

  getServices() {
    return [
      this.informationService,
      this.switchService,
    ];
  }

  async getState() {
    this.log.info(`Getting ${this.config.name} switch state`);

    if (!this.config.check_status) {
      this.log.debug(`No check_status, returning static state: ${this.currentState}`)
      return this.currentState;
    }

    this.log.debug(`Running: ${this.config.check_status}`);

    let state = null;
    try {
      execSync(this.config.check_status);
      state = !this.config.invert_status;
    } catch (error) {
      state = false;
    }

    this.log.debug(`Returning: ${state}`);
    return state;
  }

  async setState(value) {
    this.log.info(`Setting ${this.config.name} switch state to: `, value);

    let cmd = value ? this.config.turn_on : this.config.turn_off;
    let exitCode = 1;
    this.log.debug(`Running: ${cmd}`);
    try {
      execSync(cmd);
      exitCode = 0;
    } catch (error) {
      exitCode = 1;
    }

    // Set state depending on whether the command exited successfully or not.
    this.currentState = value ^ (exitCode != 0);
    this.log.debug(`Returning: ${this.currentState}}`);
    return this.currentState;
  }
}
