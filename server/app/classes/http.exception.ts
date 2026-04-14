import { AppError } from '@app/error-types/app-error';
import { ErrorCode } from '@common/error-codes';
import { StatusCodes } from 'http-status-codes';

export class HttpException extends AppError {
    constructor(errorCodes: ErrorCode[] | ErrorCode, status: number = StatusCodes.INTERNAL_SERVER_ERROR) {
        super(Array.isArray(errorCodes) ? errorCodes : [errorCodes], status);
        this.name = 'HttpException';
    }
}
