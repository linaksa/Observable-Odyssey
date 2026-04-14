import { ErrorCode } from '@common/error-codes';
import { ERROR_CODE_MESSAGES } from '@common/error-code-messages';

export function getErrorMessage(errorCode: ErrorCode): string {
    return ERROR_CODE_MESSAGES[errorCode] ?? 'Erreur inconnue';
}

export function getErrorMessages(errorCodes: readonly ErrorCode[]): string[] {
    return [...new Set(errorCodes.map((errorCode) => getErrorMessage(errorCode)))];
}
