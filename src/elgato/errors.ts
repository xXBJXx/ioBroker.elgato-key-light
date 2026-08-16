export class ElgatoError extends Error {
    public constructor(
        message: string,
        public readonly code: string,
        options?: ErrorOptions,
    ) {
        super(message, options);
        this.name = new.target.name;
    }
}

export class ElgatoTargetError extends ElgatoError {
    public constructor(message: string, options?: ErrorOptions) {
        super(message, 'INVALID_TARGET', options);
    }
}

export class ElgatoConnectionError extends ElgatoError {
    public constructor(message: string, options?: ErrorOptions) {
        super(message, 'CONNECTION_ERROR', options);
    }
}

export class ElgatoTimeoutError extends ElgatoError {
    public constructor(message: string, options?: ErrorOptions) {
        super(message, 'TIMEOUT', options);
    }
}

export class ElgatoApiError extends ElgatoError {
    public constructor(
        message: string,
        public readonly status: number,
        options?: ErrorOptions,
    ) {
        super(message, 'API_ERROR', options);
    }
}

export class ElgatoInvalidResponseError extends ElgatoError {
    public constructor(message: string, options?: ErrorOptions) {
        super(message, 'INVALID_RESPONSE', options);
    }
}

export class ElgatoUnsupportedFeatureError extends ElgatoError {
    public constructor(feature: string) {
        super(`The device does not support ${feature}.`, 'UNSUPPORTED_FEATURE');
    }
}
