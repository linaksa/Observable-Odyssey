import { StatusCodes } from 'http-status-codes';
import { ErrorCode } from '@common/error-codes';
import { getErrorMessages } from '@app/error-types/error-codes';

export class AppError extends Error {
    readonly errorCodes: ErrorCode[];
    readonly status: number;

    constructor(errorCodes: ErrorCode[], status: number = StatusCodes.INTERNAL_SERVER_ERROR, message?: string) {
        super(message ?? getErrorMessages(errorCodes).join(' ; '));
        this.errorCodes = errorCodes;
        this.status = status;
        this.name = 'AppError';
    }
}
