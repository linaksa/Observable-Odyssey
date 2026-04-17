/**
 * Testing strategy — Error Codes helpers
 *
 * Approach:
 * - Validate `getErrorMessage` for known and unknown ErrorCode inputs.
 * - Validate `getErrorMessages` for unique, duplicate, and empty code arrays.
 *
 * Edge cases covered:
 * - Unmapped numeric values return the fallback label.
 * - Duplicate codes collapse into a unique message list.
 * - Empty arrays return an empty message list.
 */
import { getErrorMessage, getErrorMessages } from '@app/error-types/error-codes';
import { ErrorCode } from '@common/error-codes';
import { expect } from 'chai';

const UNKNOWN_ERROR_CODE = 99999;

describe('Error Codes helpers', () => {
    it('returns the mapped message for a known error code — Nominal case', () => {
        const message = getErrorMessage(ErrorCode.GameNotFound);

        expect(message).to.be.a('string').and.have.length.above(0);
        expect(message).to.not.equal('Erreur inconnue');
    });

    it('returns the fallback message for an unmapped error code — Edge case', () => {
        const message = getErrorMessage(UNKNOWN_ERROR_CODE as ErrorCode);

        expect(message).to.equal('Erreur inconnue');
    });

    it('returns an array of messages for multiple unique codes — Nominal case', () => {
        const messages = getErrorMessages([ErrorCode.GameNotFound, ErrorCode.PlayerNotFound]);

        expect(messages).to.be.an('array').with.lengthOf(2);
    });

    it('deduplicates messages when two codes map to the same text — Edge case', () => {
        // Same input code repeated: output should keep one message entry.
        const messages = getErrorMessages([ErrorCode.GameNotFound, ErrorCode.GameNotFound]);

        expect(messages).to.have.lengthOf(1);
    });

    it('returns an empty array for an empty input — Edge case', () => {
        const messages = getErrorMessages([]);

        expect(messages).to.deep.equal([]);
    });
});
