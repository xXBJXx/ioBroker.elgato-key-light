"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElgatoUnsupportedFeatureError = exports.ElgatoInvalidResponseError = exports.ElgatoApiError = exports.ElgatoTimeoutError = exports.ElgatoConnectionError = exports.ElgatoTargetError = exports.ElgatoError = void 0;
class ElgatoError extends Error {
    code;
    constructor(message, code, options) {
        super(message, options);
        this.code = code;
        this.name = new.target.name;
    }
}
exports.ElgatoError = ElgatoError;
class ElgatoTargetError extends ElgatoError {
    constructor(message, options) {
        super(message, 'INVALID_TARGET', options);
    }
}
exports.ElgatoTargetError = ElgatoTargetError;
class ElgatoConnectionError extends ElgatoError {
    constructor(message, options) {
        super(message, 'CONNECTION_ERROR', options);
    }
}
exports.ElgatoConnectionError = ElgatoConnectionError;
class ElgatoTimeoutError extends ElgatoError {
    constructor(message, options) {
        super(message, 'TIMEOUT', options);
    }
}
exports.ElgatoTimeoutError = ElgatoTimeoutError;
class ElgatoApiError extends ElgatoError {
    status;
    constructor(message, status, options) {
        super(message, 'API_ERROR', options);
        this.status = status;
    }
}
exports.ElgatoApiError = ElgatoApiError;
class ElgatoInvalidResponseError extends ElgatoError {
    constructor(message, options) {
        super(message, 'INVALID_RESPONSE', options);
    }
}
exports.ElgatoInvalidResponseError = ElgatoInvalidResponseError;
class ElgatoUnsupportedFeatureError extends ElgatoError {
    constructor(feature) {
        super(`The device does not support ${feature}.`, 'UNSUPPORTED_FEATURE');
    }
}
exports.ElgatoUnsupportedFeatureError = ElgatoUnsupportedFeatureError;
//# sourceMappingURL=errors.js.map