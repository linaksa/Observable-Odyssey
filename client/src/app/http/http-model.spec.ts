/**
 * Testing strategy — http-model
 *
 * Approach:
 * - Exercise `isHttpError` with plain runtime values to validate the type-guard contract.
 * - Keep assertions focused on structural validation (`status` and `message`) instead of framework behavior.
 *
 * Edge cases covered:
 * - Non-object values (including `null`) are rejected safely.
 * - Objects missing required keys are not treated as `HttpError` instances.
 */
import { isHttpError } from '@app/http/http-model';
import { HttpError } from '@app/interfaces/http-error.interface';

const INVALID_NON_OBJECT_VALUE = 123;

describe('http-model', () => {
    it('should identify valid HttpError-like objects', () => {
        const error: HttpError = {
            status: 500,
            url: '/api/test',
            message: 'Server error',
            timestamp: new Date('2026-01-01T00:00:00.000Z'),
        };

        expect(isHttpError(error)).toBeTrue();
    });

    // Edge case: When required input data is missing, reject non-object values and null.
    it('should reject non-object values and null', () => {
        expect(isHttpError(null)).toBeFalse();
        expect(isHttpError('error')).toBeFalse();
        expect(isHttpError(INVALID_NON_OBJECT_VALUE)).toBeFalse();
    });

    it('should reject objects missing required status/message keys', () => {
        expect(isHttpError({ status: 400 })).toBeFalse();
        expect(isHttpError({ message: 'Only message' })).toBeFalse();
        expect(isHttpError({ code: 500, reason: 'oops' })).toBeFalse();
    });
});
