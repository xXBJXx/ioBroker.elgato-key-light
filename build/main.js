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
class ElgatoKeyLight extends utils.Adapter {
  constructor(options = {}) {
    super({
      ...options,
      name: "elgato-key-light"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("message", this.onMessage.bind(this));
    this.on("unload", this.onUnload.bind(this));
    this.requestTimer = null;
    this.messageHandlerTimer = null;
    this.subscribedStates = [];
    this.messageHandler = [];
  }
  async onReady() {
    this.messageHandler = [];
    this.setState("info.connection", false, true);
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
  async onMessage(obj) {
    if (typeof obj === "object" && obj.message) {
      if (obj.command === "send") {
        this.log.info("send command");
        if (obj.callback)
          this.sendTo(obj.from, obj.command, "Message received", obj.callback);
      }
    }
  }
  async onStateChange(id, state) {
    if (state) {
      if (state.from === "system.adapter." + this.namespace) {
        return;
      } else {
        this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
      }
    } else {
      return;
    }
  }
  async onUnload(callback) {
    try {
      if (this.requestTimer)
        this.clearTimeout(this.requestTimer);
      if (this.messageHandlerTimer)
        this.clearTimeout(this.messageHandlerTimer);
      this.setState("info.connection", false, true);
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
