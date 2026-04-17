import { ErrorCode, IErrorResponse } from '@common/error-codes';
import { ERROR_CODE_MESSAGES } from '@common/error-code-messages';

export function getErrorMessage(errorCode: ErrorCode): string {
    return ERROR_CODE_MESSAGES[errorCode] ?? 'Erreur inconnue';
}

export function getErrorMessages(errorCodes: readonly ErrorCode[]): string[] {
    return [...new Set(errorCodes.map((errorCode) => getErrorMessage(errorCode)))];
}

export function isErrorResponse(error: unknown): error is IErrorResponse {
    if (typeof error !== 'object' || error === null) {
        return false;
    }

    const candidate = error as { errorCodes?: unknown };
    return Array.isArray(candidate.errorCodes) && candidate.errorCodes.every((code) => typeof code === 'number');
}

export function extractErrorCodes(error: unknown): readonly ErrorCode[] | undefined {
    if (typeof error !== 'object' || error === null) {
        return undefined;
    }

    const candidate = error as {
        errorCodes?: unknown;
        originalError?: { error?: { errorCodes?: unknown } };
        error?: { errorCodes?: unknown };
    };

    if (Array.isArray(candidate.errorCodes) && candidate.errorCodes.every((code) => typeof code === 'number')) {
        return candidate.errorCodes as readonly ErrorCode[];
    }

    const nestedCodes = candidate.originalError?.error?.errorCodes ?? candidate.error?.errorCodes;
    if (Array.isArray(nestedCodes) && nestedCodes.every((code) => typeof code === 'number')) {
        return nestedCodes as readonly ErrorCode[];
    }

    return undefined;
}

export function mapErrorCodesToMessage(errorCodes: readonly ErrorCode[] | undefined, fallback: string): string {
    if (!errorCodes || errorCodes.length === 0) {
        return fallback;
    }

    return getErrorMessages(errorCodes).join('\n');
}

export function mapErrorCodeToMessage(errorCode: number | undefined, fallback: string): string {
    if (errorCode === undefined) {
        return fallback;
    }

    return getErrorMessage(errorCode as ErrorCode);
}
