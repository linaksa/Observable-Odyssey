import { AppError } from '@app/error-types/app-error';
import { ErrorCode } from '@common/error-codes';

export function toSocketError(error: unknown, fallbackCode: ErrorCode): { errorCodes: ErrorCode[] } {
    if (error instanceof AppError) {
        return { errorCodes: error.errorCodes };
    }

    return { errorCodes: [fallbackCode] };
}
