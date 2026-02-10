export interface HttpOptions {
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean>;
    responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
    withCredentials?: boolean;
}
export interface HttpError {
    status: number;
    url: string;
    message: string;
    timestamp: Date;
    originalError?: unknown;
}
export function isHttpError(error: unknown): error is HttpError {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const err = error as Record<string, unknown>;
    return 'status' in err && 'message' in err;
}
