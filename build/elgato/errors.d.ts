export declare class ElgatoError extends Error {
    readonly code: string;
    constructor(message: string, code: string, options?: ErrorOptions);
}
export declare class ElgatoTargetError extends ElgatoError {
    constructor(message: string, options?: ErrorOptions);
}
export declare class ElgatoConnectionError extends ElgatoError {
    constructor(message: string, options?: ErrorOptions);
}
export declare class ElgatoTimeoutError extends ElgatoError {
    constructor(message: string, options?: ErrorOptions);
}
export declare class ElgatoApiError extends ElgatoError {
    readonly status: number;
    constructor(message: string, status: number, options?: ErrorOptions);
}
export declare class ElgatoInvalidResponseError extends ElgatoError {
    constructor(message: string, options?: ErrorOptions);
}
export declare class ElgatoUnsupportedFeatureError extends ElgatoError {
    constructor(feature: string);
}
