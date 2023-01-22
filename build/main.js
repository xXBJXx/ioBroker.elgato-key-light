"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var utils = __toESM(require("@iobroker/adapter-core"));
var import_register = require("source-map-support/register");
var import_ElgatoKeyLightController = require("./lib/ElgatoKeyLightController");
var import_object_definition = require("./lib/object_definition");
var import_color = require("./lib/color");
const keyLightController = new import_ElgatoKeyLightController.ElgatoKeyLightController();
class ElgatoKeyLight extends utils.Adapter {
  constructor(options = {}) {
    super({
      ...options,
      name: "elgato-key-light"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
    this.requestTimer = null;
    this.messageHandlerTimer = null;
    this.messageHandler = [];
    this.devices = [];
    this.interval = 3e5;
    this.requestObject = [];
  }
  async onReady() {
    this.messageHandler = [];
    this.interval = this.config.interval * 1e3;
    this.setState("info.connection", false, true);
    const devices = await this.getDevicesAsync();
    for (const devicesKey in devices) {
      this.devices.push(devices[devicesKey].native.device);
    }
    this.writeLog(`[Adapter v.${this.version} onReady] all devices: ${this.devices.length}`, "debug");
    console.log("devices", this.devices);
    await keyLightController.on("newKeyLight", async (newKeyLight) => {
      var _a, _b, _c, _d, _e, _f;
      if (this.devices.find((element) => {
        var _a2, _b2;
        return ((_a2 = element.info) == null ? void 0 : _a2.serialNumber) === ((_b2 = newKeyLight.info) == null ? void 0 : _b2.serialNumber);
      })) {
        this.writeLog(
          `[Adapter v.${this.version} onReady] Device ${(_a = newKeyLight.info) == null ? void 0 : _a.serialNumber} already in exist`,
          "debug"
        );
      } else {
        this.writeLog(
          `[Adapter v.${this.version} onReady] Device ${(_b = newKeyLight.info) == null ? void 0 : _b.serialNumber} not in exist - add it`,
          "debug"
        );
        this.writeLog(
          `[Adapter v.${this.version} onReady] add new device: ${(_c = newKeyLight.info) == null ? void 0 : _c.serialNumber} => ${(_d = newKeyLight.info) == null ? void 0 : _d.displayName}`,
          "debug"
        );
        this.devices.push(newKeyLight);
      }
      this.writeLog(
        `[Adapter v.${this.version} onReady] start createStates for ${(_e = newKeyLight.info) == null ? void 0 : _e.serialNumber}`,
        "debug"
      );
      await this.createStates(newKeyLight);
      this.writeLog(
        `[Adapter v.${this.version} onReady] start writeState for ${(_f = newKeyLight.info) == null ? void 0 : _f.serialNumber}`,
        "debug"
      );
      await this.writeState(newKeyLight);
    });
    this.writeLog(`[Adapter v.${this.version} onReady] start requestData`, "debug");
    await this.requestData();
    this.setState("info.connection", true, true);
  }
  async requestData() {
    if (this.requestTimer)
      this.clearTimeout(this.requestTimer);
    this.requestObject = [];
    for (const device of this.devices) {
      const data = {
        ip: device.ip,
        port: device.port,
        name: device.name
      };
      await keyLightController.requestData(data).then(async (result) => {
        var _a, _b, _c;
        this.requestObject.push(result);
        const deviceName = (_a = device.info) == null ? void 0 : _a.serialNumber;
        this.writeLog(
          `[Adapter v.${this.version} requestData] request for ${(_b = device.info) == null ? void 0 : _b.displayName} was successful data: ${JSON.stringify(result)}`,
          "debug"
        );
        this.writeLog(
          `[Adapter v.${this.version} requestData] writeState for ${(_c = device.info) == null ? void 0 : _c.displayName}`,
          "debug"
        );
        await this.setStateAsync(`${deviceName}.reachable`, true, true);
        await this.writeState(result);
      }).catch(async (error) => {
        var _a, _b;
        const deviceName = (_a = device.info) == null ? void 0 : _a.serialNumber;
        this.writeLog(
          `[Adapter v.${this.version} requestData] request for ${(_b = device.info) == null ? void 0 : _b.displayName} was not successful`,
          "debug"
        );
        await this.setStateAsync(`${deviceName}.reachable`, false, true);
        this.writeLog(
          `[Adapter v.${this.version} requestData] Could not get data from ${device.name} IP: ${device.ip}`,
          "error"
        );
        this.writeLog(
          `[Adapter v.${this.version} requestData] Error: ${error} message: ${error.message}`,
          "error"
        );
      });
    }
    this.requestTimer = this.setTimeout(() => {
      this.writeLog(`[Adapter v.${this.version} requestData] next request in ${this.interval} ms`, "debug");
      this.requestData();
    }, this.interval);
  }
  async writeState(device) {
    var _a, _b, _c, _d;
    if (!device)
      return;
    let deviceName = "";
    if (device.info) {
      this.writeLog(
        `[Adapter v.${this.version} writeState] write all info states for ${device.info.displayName}`,
        "debug"
      );
      deviceName = device.info.serialNumber;
      await this.setStateAsync(`${deviceName}.info.ip`, { val: device.ip, ack: true });
      await this.setStateAsync(`${deviceName}.info.port`, { val: device.port, ack: true });
      await this.setStateAsync(`${deviceName}.info.name`, { val: device.name, ack: true });
      for (const [key, value] of Object.entries(device.info)) {
        if (key !== "wifi-info") {
          if (key === "features") {
            await this.setStateAsync(`${deviceName}.info.${key}`, {
              val: JSON.stringify(value),
              ack: true
            });
          } else if (key === "displayName") {
            const deviceConfig = this.devices.find(
              (element) => {
                var _a2, _b2;
                return ((_a2 = element.info) == null ? void 0 : _a2.serialNumber) === ((_b2 = device.info) == null ? void 0 : _b2.serialNumber);
              }
            );
            if (deviceConfig) {
              if (((_a = deviceConfig.info) == null ? void 0 : _a.displayName) !== value) {
                const index = this.devices.findIndex(
                  (element) => {
                    var _a2, _b2;
                    return ((_a2 = element.info) == null ? void 0 : _a2.serialNumber) === ((_b2 = device.info) == null ? void 0 : _b2.serialNumber);
                  }
                );
                if (index !== -1) {
                  this.devices[index].info.displayName = value;
                  this.writeLog(
                    `[Adapter v.${this.version} writeState] Change name of ${(_b = device.info) == null ? void 0 : _b.displayName} to ${value}`,
                    "debug"
                  );
                  await this.setStateAsync(`${deviceName}.info.${key}`, { val: value, ack: true });
                  await this.extendObjectAsync(deviceName, {
                    type: "device",
                    common: {
                      name: device.info.displayName || device.info.productName,
                      statusStates: {
                        onlineId: `${this.namespace}.${deviceName}.reachable`
                      }
                    },
                    native: {
                      ip: device.ip,
                      port: device.port,
                      device
                    }
                  });
                }
              } else {
                this.writeLog(
                  `[Adapter v.${this.version} writeState] Name of ${(_c = device.info) == null ? void 0 : _c.displayName} is ${value}`,
                  "debug"
                );
                await this.setStateAsync(`${deviceName}.info.${key}`, { val: value, ack: true });
              }
            }
          } else {
            this.writeLog(
              `[Adapter v.${this.version} writeState] write state ${key} with value ${value}`,
              "debug"
            );
            await this.setStateAsync(`${deviceName}.info.${key}`, { val: value, ack: true });
          }
        } else {
          for (const [key2, value2] of Object.entries(value)) {
            this.writeLog(
              `[Adapter v.${this.version} writeState] write state ${key2} with value ${value2}`,
              "debug"
            );
            await this.setStateAsync(`${deviceName}.info.wifi-info.${key2}`, {
              val: value2,
              ack: true
            });
          }
        }
      }
    }
    if (device.battery) {
      this.writeLog(`[Adapter v.${this.version} writeState] write battery state`, "debug");
      for (const [key, value] of Object.entries(device.battery)) {
        if (key === "powerSource") {
          await this.setStateAsync(`${deviceName}.battery.${key}`, {
            val: value === 1 ? "power supplies" : value === 2 ? "battery" : "unknown",
            ack: true
          });
        } else if (key === "currentBatteryVoltage") {
          await this.setStateAsync(`${deviceName}.battery.${key}`, {
            val: value / 1e3,
            ack: true
          });
        } else if (key === "inputChargeVoltage") {
          await this.setStateAsync(`${deviceName}.battery.${key}`, {
            val: value / 1e3,
            ack: true
          });
        } else if (key === "inputChargeCurrent") {
          await this.setStateAsync(`${deviceName}.battery.${key}`, {
            val: value / 1e3,
            ack: true
          });
        } else if (key === "level") {
          await this.setStateAsync(`${deviceName}.battery.${key}`, {
            val: Math.round(value),
            ack: true
          });
        } else {
          await this.setStateAsync(`${deviceName}.battery.${key}`, { val: value, ack: true });
        }
      }
    }
    if (device.settings) {
      this.writeLog(`[Adapter v.${this.version} writeState] write settings state`, "debug");
      for (const [key, value] of Object.entries(device.settings)) {
        if (key !== `battery`) {
          if (key === "powerOnTemperature") {
            const temp = Math.round(1e6 / value);
            await this.setStateAsync(`${deviceName}.settings.${key}`, { val: temp, ack: true });
          } else {
            await this.setStateAsync(`${deviceName}.settings.${key}`, { val: value, ack: true });
          }
        } else {
          if (device.settings.battery) {
            for (const [key2, value2] of Object.entries(device.settings.battery)) {
              if (key2 !== `energySaving`) {
                await this.setStateAsync(`${deviceName}.settings.battery.${key2}`, {
                  val: value2,
                  ack: true
                });
              } else {
                for (const [key3, value3] of Object.entries(device.settings.battery.energySaving)) {
                  if (key3 !== `adjustBrightness`) {
                    await this.setStateAsync(
                      `${deviceName}.settings.battery.energySaving.${key3}`,
                      {
                        val: value3,
                        ack: true
                      }
                    );
                  } else {
                    for (const [key4, value4] of Object.entries(
                      device.settings.battery.energySaving.adjustBrightness
                    )) {
                      await this.setStateAsync(
                        `${deviceName}.settings.battery.energySaving.adjustBrightness.${key4}`,
                        {
                          val: value4,
                          ack: true
                        }
                      );
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    if (device.light) {
      this.writeLog(`[Adapter v.${this.version} writeState] write light state`, "debug");
      for (const [key, value] of Object.entries(device.light)) {
        if (key !== `lights`) {
          await this.setStateAsync(`${deviceName}.light.${key}`, { val: value, ack: true });
        } else {
          for (const [key2, value2] of Object.entries(device.light.lights)) {
            for (const [key3, value3] of Object.entries(value2)) {
              if (key3 === "brightness") {
                await this.setStateAsync(`${deviceName}.light.lights.${key2}.${key3}`, {
                  val: value3,
                  ack: true
                });
              }
              if (key3 === "saturation") {
                await this.setStateAsync(`${deviceName}.light.lights.${key2}.${key3}`, {
                  val: value3,
                  ack: true
                });
              }
              if (key3 === "on") {
                await this.setStateAsync(`${deviceName}.light.lights.${key2}.${key3}`, {
                  val: value3 === 1,
                  ack: true
                });
              }
              if (key3 === "temperature") {
                const kelvin = Math.round(1e6 / value3);
                await this.setStateAsync(`${deviceName}.light.lights.${key2}.${key3}`, {
                  val: kelvin,
                  ack: true
                });
              }
              if (key3 === "hue") {
                await this.setStateAsync(`${deviceName}.light.lights.${key2}.${key3}`, {
                  val: value3,
                  ack: true
                });
                if (((_d = device.info) == null ? void 0 : _d.productName) === "Elgato Light Strip") {
                  const stripDevice = device.light;
                  let hue = stripDevice.lights[0].hue;
                  let sat = stripDevice.lights[0].saturation;
                  let bri = stripDevice.lights[0].brightness;
                  if (!hue)
                    hue = 0;
                  if (!sat)
                    sat = 0;
                  if (!bri)
                    bri = 0;
                  const hex = (0, import_color.hsbToHex)(hue, sat, bri);
                  this.writeLog(
                    `[Adapter v.${this.version} writeState] convert hsb hue: ${hue}, sat: ${sat}, bri: ${bri} to hex: ${hex} for device: ${deviceName} and write to state `,
                    "debug"
                  );
                  const rgb = (0, import_color.hsbToRgb)(hue, sat, bri);
                  await this.setStateAsync(`${deviceName}.light.lights.${key2}.hex`, {
                    val: hex,
                    ack: true
                  });
                  await this.setStateAsync(`${deviceName}.light.lights.${key2}.rgb`, {
                    val: rgb,
                    ack: true
                  });
                }
              }
            }
          }
        }
      }
    }
  }
  async createStates(device) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    let deviceName = "";
    if (device.info) {
      deviceName = device.info.serialNumber;
      this.writeLog(
        `[Adapter v.${this.version} createStates] create info states for device: ${deviceName}`,
        "debug"
      );
      await this.extendObjectAsync(deviceName, {
        type: "device",
        common: {
          name: device.info.displayName || device.info.productName,
          statusStates: {
            onlineId: `${this.namespace}.${deviceName}.reachable`
          }
        },
        native: {
          ip: device.ip,
          port: device.port,
          device
        }
      });
      await this.extendObjectAsync(`${deviceName}.info`, {
        type: "channel",
        common: {
          name: "Info",
          desc: "Information about the device"
        },
        native: {}
      });
      await this.extendObjectAsync(`${deviceName}.identify`, {
        type: "state",
        common: {
          name: "Identify",
          desc: "Identify the device",
          type: "boolean",
          role: "button",
          def: true,
          read: true,
          write: true
        },
        native: {
          ip: device.ip,
          port: device.port,
          productName: device.info.productName
        }
      });
      this.subscribeStates(`${deviceName}.identify`);
      await this.extendObjectAsync(`${deviceName}.reachable`, {
        type: "state",
        common: {
          name: "Reachable",
          desc: "Is the device reachable",
          type: "boolean",
          role: "indicator.reachable",
          def: false,
          read: true,
          write: false
        },
        native: {}
      });
      await this.extendObjectAsync(`${deviceName}.info.ip`, {
        type: "state",
        common: {
          name: "IP Address",
          desc: "IP of the device",
          type: "string",
          role: "info.ip",
          read: true,
          write: false
        },
        native: {
          ip: device.ip,
          port: device.port,
          productName: device.info.productName
        }
      });
      await this.extendObjectAsync(`${deviceName}.info.port`, {
        type: "state",
        common: {
          name: "Port",
          desc: "Port of the device",
          type: "number",
          role: "info.port",
          read: true,
          write: false
        },
        native: {
          ip: device.ip,
          port: device.port,
          productName: device.info.productName
        }
      });
      await this.extendObjectAsync(`${deviceName}.info.name`, {
        type: "state",
        common: {
          name: "Name",
          desc: "Name of the device",
          type: "string",
          role: "info.name",
          read: true,
          write: false
        },
        native: {
          ip: device.ip,
          port: device.port,
          productName: device.info.productName
        }
      });
      await this.extendObjectAsync(`info.connections`, {
        type: "state",
        common: {
          name: "Connections",
          desc: "Configured connections",
          type: "string",
          role: "json",
          read: true,
          write: false
        },
        native: {}
      });
      for (const [key] of Object.entries(device.info)) {
        if (key !== "wifi-info") {
          let common = { name: "", role: "", read: false, write: false };
          common = import_object_definition.stateAttrb[key];
          await this.extendObjectAsync(`${deviceName}.info.${key}`, {
            type: "state",
            common,
            native: {
              ip: device.ip,
              port: device.port,
              productName: device.info.productName
            }
          });
          if (common.write) {
            this.subscribeStates(`${deviceName}.info.${key}`);
          }
        } else {
          for (const [key2] of Object.entries(device.info["wifi-info"])) {
            await this.extendObjectAsync(`${deviceName}.info.${key}`, {
              type: "channel",
              common: {
                name: "wifi-info",
                desc: "Information about the wifi"
              },
              native: {}
            });
            let common = { name: "", role: "", read: false, write: false };
            common = import_object_definition.stateAttrb[key2];
            await this.extendObjectAsync(`${deviceName}.info.${key}.${key2}`, {
              type: "state",
              common,
              native: {
                ip: device.ip,
                port: device.port,
                productName: device.info.productName
              }
            });
            if (common.write) {
              this.subscribeStates(`${deviceName}.info.${key}.${key2}`);
            }
          }
        }
      }
    }
    if (device.battery) {
      this.writeLog(`[Adapter v.${this.version} createStates] create battery states for ${deviceName}`, "debug");
      await this.extendObjectAsync(`${deviceName}.battery`, {
        type: "channel",
        common: {
          name: "battery Info",
          desc: "battery info of the device"
        },
        native: {}
      });
      for (const [key] of Object.entries(device.battery)) {
        let common = { name: "", role: "", read: false, write: false };
        common = import_object_definition.stateAttrb[key];
        await this.extendObjectAsync(`${deviceName}.battery.${key}`, {
          type: "state",
          common,
          native: {
            ip: device.ip,
            port: device.port,
            productName: (_a = device.info) == null ? void 0 : _a.productName
          }
        });
      }
    }
    if (device.light) {
      this.writeLog(`[Adapter v.${this.version} createStates] create light states for ${deviceName}`, "debug");
      await this.extendObjectAsync(`${deviceName}.light`, {
        type: "channel",
        common: {
          name: "Light",
          desc: "Light settings of the device"
        },
        native: {}
      });
      for (const [key] of Object.entries(device.light)) {
        if (key !== `lights`) {
          let common = {
            name: "",
            role: "",
            read: false,
            write: false
          };
          common = import_object_definition.stateAttrb[key];
          await this.extendObjectAsync(`${deviceName}.light.${key}`, {
            type: "state",
            common,
            native: {
              ip: device.ip,
              port: device.port,
              productName: (_b = device.info) == null ? void 0 : _b.productName
            }
          });
          if (common.write) {
            this.subscribeStates(`${deviceName}.light.${key}`);
          }
        } else {
          for (const [key2, value2] of Object.entries(device.light.lights)) {
            await this.extendObjectAsync(`${deviceName}.light.${key}.${key2}`, {
              type: "channel",
              common: {
                name: "lights",
                desc: "Information about the lights"
              },
              native: {}
            });
            for (const [key3] of Object.entries(value2)) {
              let common = {
                name: "",
                role: "",
                read: false,
                write: false
              };
              if (key3 == "hue" || key3 == "saturation" || key3 == "brightness" || key3 == "temperature" || key3 == "on") {
                common = import_object_definition.stateAttrb[key3];
                await this.extendObjectAsync(`${deviceName}.light.${key}.${key2}.${key3}`, {
                  type: "state",
                  common,
                  native: {
                    ip: device.ip,
                    port: device.port,
                    productName: (_c = device.info) == null ? void 0 : _c.productName
                  }
                });
                if (common.write) {
                  this.subscribeStates(`${deviceName}.light.${key}.${key2}.${key3}`);
                  this.subscribeStates(`${deviceName}.light.${key}.${key2}.hue`);
                  this.subscribeStates(`${deviceName}.light.${key}.${key2}.saturation`);
                }
                if (((_d = device.info) == null ? void 0 : _d.productName) === "Elgato Light Strip") {
                  await this.extendObjectAsync(`${deviceName}.light.${key}.${key2}.hex`, {
                    type: "state",
                    common: import_object_definition.stateAttrb.hex,
                    native: {
                      ip: device.ip,
                      port: device.port,
                      productName: (_e = device.info) == null ? void 0 : _e.productName
                    }
                  });
                  this.subscribeStates(`${deviceName}.light.${key}.${key2}.hex`);
                  await this.extendObjectAsync(`${deviceName}.light.${key}.${key2}.rgb`, {
                    type: "state",
                    common: import_object_definition.stateAttrb.rgb,
                    native: {
                      ip: device.ip,
                      port: device.port,
                      productName: (_f = device.info) == null ? void 0 : _f.productName
                    }
                  });
                  this.subscribeStates(`${deviceName}.light.${key}.${key2}.rgb`);
                }
              } else {
                console.log(`key3: ${key3}`);
              }
            }
          }
        }
      }
    }
    if (device.settings) {
      this.writeLog(`[Adapter v.${this.version} createStates] create settings states for ${deviceName}`, "debug");
      await this.extendObjectAsync(`${deviceName}.settings`, {
        type: "channel",
        common: {
          name: "Settings",
          desc: "Settings of the device"
        },
        native: {}
      });
      for (const [key] of Object.entries(device.settings)) {
        if (key !== `battery`) {
          let common = { name: "", role: "", read: false, write: false };
          common = import_object_definition.stateAttrb[key];
          await this.extendObjectAsync(`${deviceName}.settings.${key}`, {
            type: "state",
            common,
            native: {
              ip: device.ip,
              port: device.port,
              productName: (_g = device.info) == null ? void 0 : _g.productName
            }
          });
          if (common.write) {
            this.subscribeStates(`${deviceName}.settings.${key}`);
          }
        } else {
          if (device.settings.battery) {
            for (const [key2] of Object.entries(device.settings.battery)) {
              if (key2 !== `energySaving`) {
                await this.extendObjectAsync(`${deviceName}.settings.${key}`, {
                  type: "channel",
                  common: {
                    name: "battery",
                    desc: "Information about the battery"
                  },
                  native: {}
                });
                let common = { name: "", role: "", read: false, write: false };
                common = import_object_definition.stateAttrb[key2];
                await this.extendObjectAsync(`${deviceName}.settings.${key}.${key2}`, {
                  type: "state",
                  common,
                  native: {
                    ip: device.ip,
                    port: device.port,
                    productName: (_h = device.info) == null ? void 0 : _h.productName
                  }
                });
                if (common.write) {
                  this.subscribeStates(`${deviceName}.settings.${key}.${key2}`);
                }
              } else {
                for (const [key3] of Object.entries(device.settings.battery.energySaving)) {
                  if (key3 !== `adjustBrightness`) {
                    await this.extendObjectAsync(`${deviceName}.settings.${key}.${key2}.${key3}`, {
                      type: "channel",
                      common: {
                        name: "energySaving",
                        desc: "Information about the energy saving"
                      },
                      native: {}
                    });
                    let common = {
                      name: "",
                      role: "",
                      read: false,
                      write: false
                    };
                    common = import_object_definition.stateAttrb[key3];
                    await this.extendObjectAsync(`${deviceName}.settings.${key}.${key2}.${key3}`, {
                      type: "state",
                      common,
                      native: {
                        ip: device.ip,
                        port: device.port,
                        productName: (_i = device.info) == null ? void 0 : _i.productName
                      }
                    });
                    if (common.write) {
                      this.subscribeStates(`${deviceName}.settings.${key}.${key2}.${key3}`);
                    }
                  } else {
                    for (const [key4] of Object.entries(
                      device.settings.battery.energySaving.adjustBrightness
                    )) {
                      if (key4 === `brightness`) {
                        let common = {
                          name: "",
                          role: "",
                          read: false,
                          write: false
                        };
                        common = import_object_definition.stateAttrb["adjustBrightness"];
                        await this.extendObjectAsync(
                          `${deviceName}.settings.${key}.${key2}.${key3}.${key4}`,
                          {
                            type: "state",
                            common,
                            native: {
                              ip: device.ip,
                              port: device.port,
                              productName: (_j = device.info) == null ? void 0 : _j.productName
                            }
                          }
                        );
                      } else {
                        await this.extendObjectAsync(
                          `${deviceName}.settings.${key}.${key2}.${key3}.${key4}`,
                          {
                            type: "channel",
                            common: {
                              name: "adjustBrightness",
                              desc: "Information about the adjustBrightness"
                            },
                            native: {}
                          }
                        );
                        let common = {
                          name: "",
                          role: "",
                          read: false,
                          write: false
                        };
                        common = import_object_definition.stateAttrb[key4];
                        await this.extendObjectAsync(
                          `${deviceName}.settings.${key}.${key2}.${key3}.${key4}`,
                          {
                            type: "state",
                            common,
                            native: {
                              ip: device.ip,
                              port: device.port,
                              productName: (_k = device.info) == null ? void 0 : _k.productName
                            }
                          }
                        );
                        if (common.write) {
                          this.subscribeStates(
                            `${deviceName}.settings.${key}.${key2}.${key3}.${key4}`
                          );
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    await this.setStateAsync(`${deviceName}.reachable`, true, true);
    await this.setStateAsync("info.connections", { val: JSON.stringify(this.devices), ack: true });
  }
  writeLog(logText, logType) {
    if (logType === "warn" || logType === "error") {
      if (this.messageHandler.length > 0) {
        if (!this.messageHandler.find((message) => message.message === logText)) {
          this.messageHandler.push({
            severity: logType,
            clearTimer: false,
            message: logText
          });
          if (logType === "warn")
            this.log.warn(logText);
          if (logType === "error")
            this.log.error(logText);
          this.log.debug(
            `[Adapter v.${this.version} writeLog] messageHandler: ` + JSON.stringify(this.messageHandler)
          );
        } else {
          if (!this.messageHandler.find((message) => message.message === logText).clearTimer) {
            this.messageHandler.find((message) => message.message === logText).clearTimer = true;
            this.messageHandlerTimer = this.setTimeout(() => {
              this.messageHandler.find((message) => message.message === logText).clearTimer = false;
              this.messageHandler = this.messageHandler.filter((message) => message.message !== logText);
              this.log.debug(`[Adapter v.${this.version} writeLog] clear messageHandler for ${logText}`);
            }, 3e5);
          }
          this.log.debug(
            `[Adapter v.${this.version} writeLog] messageHandler: ` + JSON.stringify(this.messageHandler)
          );
        }
      } else {
        this.messageHandler.push({
          severity: logType,
          clearTimer: false,
          message: logText
        });
        if (logType === "warn")
          this.log.warn(logText);
        if (logType === "error")
          this.log.error(logText);
        this.log.debug(
          `[Adapter v.${this.version} writeLog] messageHandler: ` + JSON.stringify(this.messageHandler)
        );
      }
    } else {
      if (logType === "silly")
        this.log.silly(logText);
      if (logType === "info")
        this.log.info(logText);
      if (logType === "debug")
        this.log.debug(logText);
    }
  }
  async onStateChange(id, state) {
    var _a;
    if (state) {
      if (state.from === "system.adapter." + this.namespace) {
        return;
      } else {
        this.writeLog(
          `[Adapter v.${this.version} onStateChange] state ${id} changed: ${state.val} (ack = ${state.ack})`,
          "debug"
        );
        const stateName = id.split(".").pop();
        const obj = await this.getForeignObjectAsync(id);
        if (obj) {
          const native = obj.native;
          if (stateName === "identify") {
            this.writeLog(`[Adapter v.${this.version} onStateChange] identify the device`, "debug");
            await keyLightController.identify(native).then(() => {
              this.writeLog(
                `[Adapter v.${this.version} onStateChange] identify was successful`,
                "info"
              );
            }).catch((error) => {
              this.writeLog(
                `[Adapter v.${this.version} onStateChange] identify was not successful: ${error}`,
                "error"
              );
            });
          }
          if (stateName === "on") {
            this.writeLog(
              `[Adapter v.${this.version} onStateChange] on for ${native.ip} set to ${state.val}`,
              "debug"
            );
            const value = state.val ? 1 : 0;
            const options = {
              lights: [
                {
                  on: value
                }
              ]
            };
            await keyLightController.updateLightOptions(native, options).then(async () => {
              console.log(
                `[Adapter v.${this.version} onStateChange] on for ${native.ip} set to ${value} => ${state.val}`
              );
              this.writeLog(
                `[Adapter v.${this.version} onStateChange] on for ${native.ip} set to ${value} => ${state.val}`,
                "debug"
              );
              await this.setStateAsync(id, state.val, true);
            }).catch((error) => {
              if (error.response) {
                this.writeLog(
                  `[Adapter v.${this.version} onStateChange] Error send on for ${native.ip} ${error.message} >> message: ${JSON.stringify(error.response.data.errors)}`,
                  "error"
                );
              } else {
                this.writeLog(
                  `[Adapter v.${this.version} onStateChange] Error send on for ${native.ip} ${error.message}`,
                  "error"
                );
              }
            });
          }
          if (stateName === "brightness") {
            this.writeLog(
              `[Adapter v.${this.version} onStateChange] brightness for ${native.ip} set to ${state.val}`,
              "debug"
            );
            let options = {};
            if (native.productName === "Elgato Light Strip") {
              const requestObject = this.requestObject.find((obj2) => obj2.ip === native.ip);
              if (requestObject) {
                if ((_a = requestObject.light) == null ? void 0 : _a.lights[0].scene) {
                  options = {
                    lights: [
                      {
                        id: requestObject.light.lights[0].id,
                        name: requestObject.light.lights[0].name,
                        brightness: state.val,
                        numberOfSceneElements: requestObject.light.lights[0].numberOfSceneElements,
                        scene: requestObject.light.lights[0].scene
                      }
                    ]
                  };
                  console.log(`scene Mode`);
                } else {
                  options = {
                    lights: [
                      {
                        brightness: state.val
                      }
                    ]
                  };
                  console.log(`brightness Mode`);
                }
              }
            } else {
              options = {
                lights: [
                  {
                    brightness: state.val
                  }
                ]
              };
            }
            await keyLightController.updateLightOptions(native, options).then(async () => {
              console.log(
                `[Adapter v.${this.version} onStateChange] brightness for ${native.ip} set to ${state.val}%`
              );
              this.writeLog(
                `[Adapter v.${this.version} onStateChange] brightness for ${native.ip} set to ${state.val}%`,
                "debug"
              );
              await this.setStateAsync(id, state.val, true);
            }).catch((error) => {
              if (error.response) {
                this.writeLog(
                  `[Adapter v.${this.version} onStateChange] Error send brightness for ${native.ip} ${error.message} >> message: ${JSON.stringify(error.response.data.errors)}`,
                  "error"
                );
              } else {
                this.writeLog(
                  `[Adapter v.${this.version} onStateChange] Error send brightness for ${native.ip} ${error.message}`,
                  "error"
                );
              }
            });
          }
          if (stateName === "temperature") {
            this.writeLog(
              `[Adapter v.${this.version} onStateChange] temperature for ${native.ip} set to ${state.val}`,
              "debug"
            );
            const value = state.val;
            let mired = 143;
            if (value) {
              mired = 1e6 / value;
              mired = Math.round(mired);
              if (mired < 143)
                mired = 143;
              if (mired > 344)
                mired = 344;
            } else {
              mired = 143;
            }
            const options = {
              lights: [
                {
                  temperature: mired
                }
              ]
            };
            await keyLightController.updateLightOptions(native, options).then(async () => {
              console.log(
                `[Adapter v.${this.version} onStateChange] temperature for ${native.ip} set to ${mired} => ${value}K`
              );
              this.writeLog(
                `[Adapter v.${this.version} onStateChange] temperature for ${native.ip} set to ${mired} => ${value}K`,
                "debug"
              );
              await this.setStateAsync(id, value, true);
            }).catch((error) => {
              if (error.response) {
                this.writeLog(
                  `[Adapter v.${this.version} onStateChange] Error send temperature for ${native.ip} ${error.message} >> message: ${JSON.stringify(error.response.data.errors)}`,
                  "error"
                );
              } else {
                this.writeLog(
                  `[Adapter v.${this.version} onStateChange] Error send temperature for ${native.ip} ${error.message}`,
                  "error"
                );
              }
            });
          }
          if (stateName === "displayName") {
            this.writeLog(
              `[Adapter v.${this.version} onStateChange] displayName for ${native.ip} set to ${state.val}`,
              "debug"
            );
            const value = state.val;
            const options = {
              displayName: value
            };
            await keyLightController.updateLightInfo(native, options).then(async () => {
              console.log(
                `[Adapter v.${this.version} onStateChange] displayName for ${native.ip} set to ${value}`
              );
              this.writeLog(
                `[Adapter v.${this.version} onStateChange] displayName for ${native.ip} set to ${value}`,
                "debug"
              );
              await this.setStateAsync(id, value, true);
            }).catch((error) => {
              if (error.response) {
                this.writeLog(
                  `[Adapter v.${this.version} onStateChange] Error send displayName for ${native.ip} ${error.message} >> message: ${JSON.stringify(error.response.data.errors)}`,
                  "error"
                );
              } else {
                this.writeLog(
                  `[Adapter v.${this.version} onStateChange] Error send displayName for ${native.ip} ${error.message}`,
                  "error"
                );
              }
            });
          }
          if (stateName === "hue") {
            this.writeLog(
              `[Adapter v.${this.version} onStateChange] hue for ${native.ip} set to ${state.val}`,
              "debug"
            );
            const value = state.val;
            const options = {
              lights: [
                {
                  hue: value
                }
              ]
            };
            await keyLightController.updateLightOptions(native, options).then(async () => {
              console.log(
                `[Adapter v.${this.version} onStateChange] hue for ${native.ip} set to ${value}`
              );
              this.writeLog(
                `[Adapter v.${this.version} onStateChange] hue for ${native.ip} set to ${value}`,
                "debug"
              );
              await this.setStateAsync(id, value, true);
            }).catch((error) => {
              if (error.response) {
                this.writeLog(
                  `[Adapter v.${this.version} onStateChange] Error send hue for ${native.ip} ${error.message} >> message: ${JSON.stringify(error.response.data.errors)}`,
                  "error"
                );
              } else {
                this.writeLog(
                  `[Adapter v.${this.version} onStateChange] Error send hue for ${native.ip} ${error.message}`,
                  "error"
                );
              }
            });
          }
          if (stateName === "saturation") {
            this.writeLog(
              `[Adapter v.${this.version} onStateChange] saturation for ${native.ip} set to ${state.val}`,
              "debug"
            );
            const value = state.val;
            const options = {
              lights: [
                {
                  saturation: value
                }
              ]
            };
            await keyLightController.updateLightOptions(native, options).then(async () => {
              console.log(
                `[Adapter v.${this.version} onStateChange] saturation for ${native.ip} set to ${value}`
              );
              this.writeLog(
                `[Adapter v.${this.version} onStateChange] saturation for ${native.ip} set to ${value}`,
                "debug"
              );
              await this.setStateAsync(id, value, true);
            }).catch((error) => {
              if (error.response) {
                this.writeLog(
                  `[Adapter v.${this.version} onStateChange] Error send saturation for ${native.ip} ${error.message} >> message: ${JSON.stringify(error.response.data.errors)}`,
                  "error"
                );
              } else {
                this.writeLog(
                  `[Adapter v.${this.version} onStateChange] Error send saturation for ${native.ip} ${error.message}`,
                  "error"
                );
              }
            });
          }
          if (stateName === "hex") {
            this.writeLog(
              `[Adapter v.${this.version} onStateChange] hex for ${native.ip} set to ${state.val}`,
              "debug"
            );
            const value = state.val;
            let hue = 0;
            let sat = 0;
            let bri = 0;
            const hsb = (0, import_color.hexToHsb)(value);
            hue = Math.round(hsb[0]);
            sat = Math.round(hsb[1]);
            bri = Math.round(hsb[2]);
            const options = {
              lights: [
                {
                  hue,
                  saturation: sat,
                  brightness: bri
                }
              ]
            };
            await keyLightController.updateLightOptions(native, options).then(async () => {
              console.log(
                `[Adapter v.${this.version} onStateChange] hex for ${native.ip} set to ${value}`
              );
              this.writeLog(
                `[Adapter v.${this.version} onStateChange] hex for ${native.ip} set to ${value}`,
                "debug"
              );
              await this.setStateAsync(id, value, true);
            }).catch((error) => {
              if (error.response) {
                this.writeLog(
                  `[Adapter v.${this.version} onStateChange] Error send hex for ${native.ip} ${error.message} >> message: ${JSON.stringify(error.response.data.errors)}`,
                  "error"
                );
              } else {
                this.writeLog(
                  `[Adapter v.${this.version} onStateChange] Error send hex for ${native.ip} ${error.message}`,
                  "error"
                );
              }
            });
          }
          if (stateName === "rgb") {
            this.writeLog(
              `[Adapter v.${this.version} onStateChange] rgb for ${native.ip} set to ${state.val}`,
              "debug"
            );
            const value = state.val;
            let hue = 0;
            let sat = 0;
            let bri = 0;
            const rgb = value.split(",");
            const hsb = (0, import_color.rgbToHsb)(parseInt(rgb[0]), parseInt(rgb[1]), parseInt(rgb[2]));
            hue = Math.round(hsb[0]);
            sat = Math.round(hsb[1]);
            bri = Math.round(hsb[2]);
            const options = {
              lights: [
                {
                  hue,
                  saturation: sat,
                  brightness: bri
                }
              ]
            };
            await keyLightController.updateLightOptions(native, options).then(async () => {
              console.log(
                `[Adapter v.${this.version} onStateChange] rgb for ${native.ip} set to ${value}`
              );
              this.writeLog(
                `[Adapter v.${this.version} onStateChange] rgb for ${native.ip} set to ${value}`,
                "debug"
              );
              await this.setStateAsync(id, value, true);
            }).catch((error) => {
              if (error.response) {
                this.writeLog(
                  `[Adapter v.${this.version} onStateChange] Error send rgb for ${native.ip} ${error.message} >> message: ${JSON.stringify(error.response.data.errors)}`,
                  "error"
                );
              } else {
                this.writeLog(
                  `[Adapter v.${this.version} onStateChange] Error send rgb for ${native.ip} ${error.message}`,
                  "error"
                );
              }
            });
          }
        }
      }
    } else {
      return;
    }
  }
  async onUnload(callback) {
    var _a;
    try {
      this.writeLog(`[Adapter v.${this.version} onUnload] Adapter stopped`, "debug");
      if (this.requestTimer)
        this.clearTimeout(this.requestTimer);
      if (this.messageHandlerTimer)
        this.clearTimeout(this.messageHandlerTimer);
      this.setState("info.connection", false, true);
      for (const devicesKey in this.devices) {
        this.setState(`${(_a = this.devices[devicesKey].info) == null ? void 0 : _a.serialNumber}.reachable`, false, true);
      }
      callback();
    } catch (e) {
      callback();
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new ElgatoKeyLight(options);
} else {
  (() => new ElgatoKeyLight())();
}
//# sourceMappingURL=main.js.map
