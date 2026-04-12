import type { ResponseType } from '@app/http/http-model';

export interface HttpOptions {
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean>;
    responseType?: ResponseType;
    withCredentials?: boolean;
}
