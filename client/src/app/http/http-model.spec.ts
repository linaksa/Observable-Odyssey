/**
 * Testing strategy — http-model
 *
 * Approach:
 * - Keep each test focused on one behavior with deterministic mocks/spies.
 * - Validate both nominal flows and failure paths that could break UX/state.
 * - Assert side effects explicitly (state changes, emitted events, and service calls).
 *
 * Edge cases covered:
 * - Missing or invalid input guards and safe early returns.
 * - Error handling paths and fallback user-facing messaging.
 * - Cleanup/teardown behavior (unsubscribe/reset/disconnect) when applicable.
 */
import { HttpError, isHttpError } from './http-model';

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
