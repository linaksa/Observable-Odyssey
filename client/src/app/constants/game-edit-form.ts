import { ErrorCode } from '@common/error-codes';

export const UNKNOWN_SAVE_ERROR_MESSAGE = 'Erreur inconnue, veuillez réessayer plus tard';

export const ERRORS_ALREADY_SHOWN_ELSEWHERE = new Set<ErrorCode>([
    ErrorCode.GameTitleMissing,
    ErrorCode.GameTitleTooLong,
    ErrorCode.GameDescriptionMissing,
    ErrorCode.GameDescriptionTooLong,
    ErrorCode.BoardInvalidDoorPlacement,
    ErrorCode.BoardInaccessibleCells,
    ErrorCode.BoardInvalidSpawnCount,
    ErrorCode.BoardMissingFlag,
]);
