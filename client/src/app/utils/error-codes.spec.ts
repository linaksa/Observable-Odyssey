/**
 * Testing strategy — Error-code utilities
 *
 * Approach:
 * - Validate parsing/type-guard behavior for multiple payload shapes.
 * - Verify message mapping and fallback behavior.
 *
 * Edge cases covered:
 * - Unknown values and invalid nested payloads.
 */
import {
    extractErrorCodes,
    getErrorMessage,
    getErrorMessages,
    isErrorResponse,
    mapErrorCodeToMessage,
    mapErrorCodesToMessage,
} from '@app/utils/error-codes';
import { ErrorCode } from '@common/error-codes';

const UNKNOWN_ERROR_CODE = 999999;

describe('error-codes utilities', () => {
    it('maps known and unknown error codes to messages', () => {
        // Nominal case
        expect(getErrorMessage(ErrorCode.GameNotFound)).toBe('Jeu introuvable');
        expect(getErrorMessage(UNKNOWN_ERROR_CODE as ErrorCode)).toBe('Erreur inconnue');
    });

    it('deduplicates mapped error messages', () => {
        // Nominal case
        const result = getErrorMessages([ErrorCode.GameNotFound, ErrorCode.GameNotFound, ErrorCode.RouteNotFound]);

        expect(result).toEqual(['Jeu introuvable', 'Route introuvable.']);
    });

    it('detects valid and invalid error response payloads', () => {
        // Edge case
        expect(isErrorResponse({ errorCodes: [ErrorCode.GameNotFound] })).toBeTrue();
        expect(isErrorResponse({ errorCodes: ['bad'] })).toBeFalse();
        expect(isErrorResponse(null)).toBeFalse();
        expect(isErrorResponse('oops')).toBeFalse();
    });

    it('extracts error codes from top-level and nested payloads', () => {
        // Nominal case
        expect(extractErrorCodes({ errorCodes: [ErrorCode.GameNotFound] })).toEqual([ErrorCode.GameNotFound]);
        expect(
            extractErrorCodes({
                originalError: {
                    error: {
                        errorCodes: [ErrorCode.RouteNotFound],
                    },
                },
            }),
        ).toEqual([ErrorCode.RouteNotFound]);
        expect(extractErrorCodes({ error: { errorCodes: [ErrorCode.ActiveGameNotFound] } })).toEqual([ErrorCode.ActiveGameNotFound]);
    });

    it('returns undefined for invalid error code payloads', () => {
        // Edge case
        expect(extractErrorCodes(undefined)).toBeUndefined();
        expect(extractErrorCodes({ errorCodes: [ErrorCode.GameNotFound, 'bad'] })).toBeUndefined();
        expect(extractErrorCodes({ originalError: { error: { errorCodes: ['bad'] } } })).toBeUndefined();
    });

    it('maps error arrays and single code with fallback behavior', () => {
        // Nominal case
        expect(mapErrorCodesToMessage([ErrorCode.GameNotFound, ErrorCode.RouteNotFound], 'Fallback')).toBe('Jeu introuvable\nRoute introuvable.');
        expect(mapErrorCodesToMessage([], 'Fallback')).toBe('Fallback');
        expect(mapErrorCodesToMessage(undefined, 'Fallback')).toBe('Fallback');

        expect(mapErrorCodeToMessage(ErrorCode.RouteNotFound, 'Fallback')).toBe('Route introuvable.');
        expect(mapErrorCodeToMessage(undefined, 'Fallback')).toBe('Fallback');
    });
});
