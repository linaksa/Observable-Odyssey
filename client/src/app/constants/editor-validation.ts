import { ErrorCode } from '@common/error-codes';

export const BOARD_ERROR_CODES = new Set<ErrorCode>([
    ErrorCode.BoardInvalidSize,
    ErrorCode.BoardInvalidDoorPlacement,
    ErrorCode.BoardLowTerrainCoverage,
    ErrorCode.BoardInvalidSpawnCount,
    ErrorCode.BoardInvalidFightSanctuaryCount,
    ErrorCode.BoardInvalidLifeSanctuaryCount,
    ErrorCode.BoardMissingFlag,
    ErrorCode.BoardInaccessibleCells,
]);

export const CARDINAL_DIRECTIONS: readonly [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
];
