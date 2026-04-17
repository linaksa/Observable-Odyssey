import { HttpError } from '@app/interfaces/http-error.interface';

export enum ResponseType {
    Json = 'json',
    Text = 'text',
    Blob = 'blob',
    ArrayBuffer = 'arraybuffer',
}

export function isHttpError(error: unknown): error is HttpError {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const err = error as Record<string, unknown>;
    return 'status' in err && 'message' in err;
}
