import { ErrorCode, IErrorResponse } from '@common/error-codes';
import { AppError } from './app-error';

export function toErrorResponse(error: unknown, fallbackCode: ErrorCode = ErrorCode.InternalServerError): IErrorResponse {
    if (error instanceof AppError) {
        return { errorCodes: error.errorCodes };
    }

    return { errorCodes: [fallbackCode] };
}
