"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var ElgatoKeyLightController_exports = {};
__export(ElgatoKeyLightController_exports, {
  ElgatoKeyLightController: () => ElgatoKeyLightController
});
module.exports = __toCommonJS(ElgatoKeyLightController_exports);
var import_bonjour_service = require("bonjour-service");
var import_events = require("events");
var import_axios = __toESM(require("axios"));
var import_register = require("source-map-support/register");
class ElgatoKeyLightController extends import_events.EventEmitter {
  constructor() {
    super();
    const bonjour = new import_bonjour_service.Bonjour();
    this.keyLights = [];
    this.lightStrips = [];
    bonjour.find({ type: "elg" }, async (service) => {
      if (service.txt.md.startsWith("Elgato Key Light")) {
        await this.addKeyLight({
          ip: service["referer"].address,
          port: service.port,
          name: service.name
        });
      }
      if (service.txt.md.startsWith("Elgato Light Strip")) {
        await this.addKeyLight({
          ip: service["referer"].address,
          port: service.port,
          name: service.name
        });
      }
    });
  }
  async addKeyLight(keyLight) {
    var _a;
    try {
      const settingsCall = await import_axios.default.get(`http://${keyLight.ip}:${keyLight.port}/elgato/lights/settings`);
      keyLight.settings = settingsCall.data;
      const infoCall = await import_axios.default.get(`http://${keyLight.ip}:${keyLight.port}/elgato/accessory-info`);
      keyLight.info = infoCall.data;
      const optionsCall = await import_axios.default.get(`http://${keyLight.ip}:${keyLight.port}/elgato/lights`);
      keyLight.light = optionsCall.data;
      if ((_a = keyLight.info) == null ? void 0 : _a.productName.startsWith("Elgato Key Light Mini")) {
        const batteryCall = await import_axios.default.get(`http://${keyLight.ip}:${keyLight.port}/elgato/battery-info`);
        keyLight.battery = batteryCall.data;
      }
      this.keyLights.push(keyLight);
      this.emit("newKeyLight", keyLight);
    } catch (e) {
      console.error(e);
    }
  }
  async requestData(device) {
    return new Promise(async (resolve, reject) => {
      try {
        const settingsCall = await import_axios.default.get(`http://${device.ip}:${device.port}/elgato/lights/settings`);
        device.settings = settingsCall.data;
        const infoCall = await import_axios.default.get(`http://${device.ip}:${device.port}/elgato/accessory-info`);
        device.info = infoCall.data;
        const optionsCall = await import_axios.default.get(`http://${device.ip}:${device.port}/elgato/lights`);
        device.light = optionsCall.data;
        return resolve(device);
      } catch (error) {
        console.error(error);
        return reject(error);
      }
    });
  }
  async updateLightOptions(device, options) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await import_axios.default.put(`http://${device.ip}:${device.port}/elgato/lights`, options);
        return resolve(result);
      } catch (e) {
        console.error(e);
        return reject(e);
      }
    });
  }
  async updateLightSettings(device, options) {
    return new Promise(async (resolve, reject) => {
      try {
        await import_axios.default.put(`http://${device.ip}:${device.port}/elgato/lights/settings`, options);
        return resolve();
      } catch (e) {
        console.error(e);
        return reject(e);
      }
    });
  }
  async updateLightInfo(device, options) {
    return new Promise(async (resolve, reject) => {
      try {
        await import_axios.default.put(`http://${device.ip}:${device.port}/elgato/accessory-info`, options);
        return resolve();
      } catch (e) {
        console.error(e);
        return reject(e);
      }
    });
  }
  async updateAllLights(options) {
    return new Promise((resolve, reject) => {
      for (let x = 0; x < this.keyLights.length; x++) {
        this.updateLightOptions(this.keyLights[x], options).catch((e) => {
          return reject(e);
        });
      }
      return resolve();
    });
  }
  async updateAllStrips(options) {
    return new Promise((resolve, reject) => {
      for (let x = 0; x < this.keyLights.length; x++) {
        this.updateLightOptions(this.keyLights[x], options).catch((e) => {
          return reject(e);
        });
      }
      return resolve();
    });
  }
  async identify(device) {
    return new Promise(async (resolve, reject) => {
      try {
        await import_axios.default.post(`http://${device.ip}:${device.port ? device.port : 9123}/elgato/identify`);
        return resolve();
      } catch (e) {
        return reject(e);
      }
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ElgatoKeyLightController
});
//# sourceMappingURL=ElgatoKeyLightController.js.map
