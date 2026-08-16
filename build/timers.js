"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemTimers = void 0;
exports.systemTimers = {
    set: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
    clear: handle => globalThis.clearTimeout(handle),
};
//# sourceMappingURL=timers.js.map