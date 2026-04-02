export enum ResponseType {
    Json = 'json',
    Text = 'text',
    Blob = 'blob',
    ArrayBuffer = 'arraybuffer',
}

export interface HttpOptions {
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean>;
    responseType?: ResponseType;
    withCredentials?: boolean;
}
export interface HttpError {
    status: number;
    url: string;
    message: string;
    timestamp: Date;
    originalError?: unknown;
    errorCodes?: readonly number[];
}
export function isHttpError(error: unknown): error is HttpError {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const err = error as Record<string, unknown>;
    return 'status' in err && 'message' in err;
}
