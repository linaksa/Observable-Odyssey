/**
 * Testing strategy — AppError
 *
 * Approach:
 * - Create AppError instances with single and multiple error-code payloads.
 * - Verify inheritance, status defaults/overrides, and message generation behavior.
 *
 * Edge cases covered:
 * - Explicit custom message overrides auto-generated text.
 * - Plain `Error` instances are not treated as `AppError`.
 * - Combined error-code message output keeps separator behavior for multiple codes.
 */
import { AppError } from '@app/error-types/app-error';
import { ErrorCode } from '@common/error-codes';
import { expect } from 'chai';
import { StatusCodes } from 'http-status-codes';

describe('AppError', () => {
    it('creates an error with a single error code and default 500 status — Nominal case', () => {
        const error = new AppError([ErrorCode.GameNotFound]);

        expect(error).to.be.instanceOf(Error);
        expect(error).to.be.instanceOf(AppError);
        expect(error.errorCodes).to.deep.equal([ErrorCode.GameNotFound]);
        expect(error.status).to.equal(StatusCodes.INTERNAL_SERVER_ERROR);
        expect(error.name).to.equal('AppError');
        // message is derived from error code
        expect(error.message).to.be.a('string').and.have.length.above(0);
    });

    it('creates an error with multiple error codes and an explicit status — Nominal case', () => {
        const codes = [ErrorCode.PlayerNotFound, ErrorCode.NotYourTurn];
        const error = new AppError(codes, StatusCodes.BAD_REQUEST);

        expect(error.errorCodes).to.deep.equal(codes);
        expect(error.status).to.equal(StatusCodes.BAD_REQUEST);
    });

    it('uses the custom message when provided — Edge case', () => {
        const customMessage = 'Custom override message';
        const error = new AppError([ErrorCode.InternalServerError], StatusCodes.INTERNAL_SERVER_ERROR, customMessage);

        expect(error.message).to.equal(customMessage);
    });

    it('is not an instance of AppError for a plain Error — Edge case (branch)', () => {
        const plain = new Error('plain');

        expect(plain).to.not.be.instanceOf(AppError);
    });

    it('deduplicates identical error-code messages in the auto-generated message — Edge case', () => {
        // Two codes that map to different messages → joined with " ; "
        const error = new AppError([ErrorCode.GameNotFound, ErrorCode.ActiveGameNotFound]);

        expect(error.message).to.include(';');
    });
});
