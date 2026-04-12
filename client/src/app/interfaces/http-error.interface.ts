export interface HttpError {
    status: number;
    url: string;
    message: string;
    timestamp: Date;
    originalError?: unknown;
    errorCodes?: readonly number[];
}
