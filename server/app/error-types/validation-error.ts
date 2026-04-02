import { ErrorCode } from '@common/error-codes';
import { StatusCodes } from 'http-status-codes';
import { AppError } from './app-error';

export class ValidationError extends AppError {
    constructor(errorCodes: ErrorCode[] | ErrorCode) {
        super(Array.isArray(errorCodes) ? errorCodes : [errorCodes], StatusCodes.BAD_REQUEST);
        this.name = 'ValidationError';
    }
}
