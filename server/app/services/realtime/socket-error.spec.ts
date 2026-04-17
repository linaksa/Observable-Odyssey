/**
 * Testing strategy — toSocketError
 *
 * Approach:
 * - Convert representative thrown values through toSocketError and assert emitted errorCodes payloads.
 * - Keep assertions strict to guarantee socket-safe shape consistency.
 *
 * Edge cases covered:
 * - Unknown Error instances fallback to the caller-provided code.
 * - Non-Error values (including strings and undefined) also resolve to fallback codes.
 */
import { AppError } from '@app/error-types/app-error';
import { toSocketError } from '@app/services/realtime/socket-error';
import { ErrorCode } from '@common/error-codes';
import { expect } from 'chai';
import { StatusCodes } from 'http-status-codes';

describe('toSocketError', () => {
    it('returns the errorCodes from an AppError instance — Nominal case', () => {
        const appError = new AppError([ErrorCode.PlayerNotFound, ErrorCode.NotYourTurn], StatusCodes.NOT_FOUND);

        const result = toSocketError(appError, ErrorCode.InternalServerError);

        expect(result).to.deep.equal({ errorCodes: [ErrorCode.PlayerNotFound, ErrorCode.NotYourTurn] });
    });

    it('returns the fallback code for a plain Error — Edge case', () => {
        const plain = new Error('unexpected');

        const result = toSocketError(plain, ErrorCode.PositionNotWalkable);

        expect(result).to.deep.equal({ errorCodes: [ErrorCode.PositionNotWalkable] });
    });

    it('returns the fallback code for a non-Error thrown value — Edge case', () => {
        const result = toSocketError('string-error', ErrorCode.InvalidDoorTarget);

        expect(result).to.deep.equal({ errorCodes: [ErrorCode.InvalidDoorTarget] });
    });

    it('returns the fallback code for undefined — Edge case', () => {
        const result = toSocketError(undefined, ErrorCode.InternalServerError);

        expect(result).to.deep.equal({ errorCodes: [ErrorCode.InternalServerError] });
    });
});
