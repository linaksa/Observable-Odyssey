/**
 * Testing strategy — HttpException
 *
 * Approach:
 * - Instantiate the exception with single and multiple error-code inputs.
 * - Assert normalization of `errorCodes` plus status-code behavior.
 *
 * Edge cases covered:
 * - A single enum value is wrapped into an array.
 * - Omitting status falls back to HTTP 500.
 */
import { HttpException } from '@app/classes/http.exception';
import { ErrorCode } from '@common/error-codes';
import { StatusCodes } from 'http-status-codes';
import { expect } from 'chai';

describe('Http Exception', () => {
    it('stores a single code as an array with default status', () => {
        const exception = new HttpException(ErrorCode.GameNotFound);

        expect(exception.name).to.equal('HttpException');
        expect(exception.errorCodes).to.deep.equal([ErrorCode.GameNotFound]);
        expect(exception.status).to.equal(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it('stores multiple codes and provided status', () => {
        const exception = new HttpException([ErrorCode.GameNotFound, ErrorCode.PlayerNotFound], StatusCodes.BAD_REQUEST);

        expect(exception.errorCodes).to.deep.equal([ErrorCode.GameNotFound, ErrorCode.PlayerNotFound]);
        expect(exception.status).to.equal(StatusCodes.BAD_REQUEST);
    });
});
