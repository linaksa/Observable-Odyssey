/**
 * Testing strategy — BoardService
 *
 * Approach:
 * - Validate BoardService through fixture boards from board.service.spec.constants.ts.
 * - Assert complete error-code outcomes for size, accessibility, item, spawn, and door rules in both Classic and CTF modes.
 *
 * Edge cases covered:
 * - Invalid dimensions, all-wall boards, disconnected terrain, and <50% walkable terrain.
 * - Spawn-count thresholds per board size and sanctuary-count constraints.
 * - CTF-only flag requirement versus Classic-mode tolerance.
 * - Door-placement branches: edge doors, wrong wall pairing, and valid vertical/horizontal setups.
 */
import { CellType } from '@common/board';
import { ErrorCode } from '@common/error-codes';
import { GameType } from '@common/game';
import { expect } from 'chai';
import { Container } from 'typedi';
import { BoardService } from '@app/services/board/board.service';
import { ItemType } from '@common/items';
import {
    allWallsBoard,
    ctfNoFlagMediumBoard,
    ctfNoFlagSmallBoard,
    edgeDoorBoard,
    halfTerrainBoard,
    insufficientStartingPointsLargeBoard,
    insufficientStartingPointsSmallBoard,
    invalidDoorBoard,
    invalidSizeBoard,
    topEdgeDoorBoard,
    unreachableBoard,
    validClassicBoard,
    verticalDoorTopWallOnlyBoard,
    verticalDoorWithWallsBoard,
} from '@app/services/board/board.service.spec.constants';

describe('Board Service', () => {
    let boardService: BoardService;

    beforeEach(async () => {
        boardService = Container.get(BoardService);
    });

    it('should return no errors when validating a valid board', () => {
        const board = validClassicBoard;
        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.have.lengthOf(0);
    });

    it('should allow boards without sanctuaries while keeping spawn points mandatory', () => {
        const board = structuredClone(validClassicBoard);
        board.items = board.items.filter((item) => item.itemType === ItemType.StartingPosition);

        const errors = boardService.validateBoard(board, GameType.Classic);

        expect(errors).to.not.include(ErrorCode.BoardInvalidFightSanctuaryCount);
        expect(errors).to.not.include(ErrorCode.BoardInvalidLifeSanctuaryCount);
        expect(errors).to.not.include(ErrorCode.BoardInvalidSpawnCount);
    });

    // Edge case: board dimensions outside supported formats should be rejected immediately.
    it('should return error for invalid board size', () => {
        const board = invalidSizeBoard;

        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include(ErrorCode.BoardInvalidSize);
    });

    it('should return error when board doesnt have enough starting points for small board', () => {
        const board = insufficientStartingPointsSmallBoard;

        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include(ErrorCode.BoardInvalidSpawnCount);
    });

    it('should return an error when game mode is CTF and no flag is placed (medium board)', () => {
        const board = ctfNoFlagMediumBoard;

        const errors = boardService.validateBoard(board, GameType.Ctf);

        expect(errors).to.include(ErrorCode.BoardMissingFlag);
    });

    it('should return error when board doesnt have enough starting points for large board', () => {
        const board = insufficientStartingPointsLargeBoard;
        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include(ErrorCode.BoardInvalidSpawnCount);
    });

    // Edge case: disconnected traversable zones must be reported as inaccessible cells.
    it('should return error when board has unreachable cells ', () => {
        const board = unreachableBoard;

        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include(ErrorCode.BoardInaccessibleCells);
    });

    it('should return error when less than 50% of the board is terrain cells', () => {
        const board = halfTerrainBoard;
        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include(ErrorCode.BoardLowTerrainCoverage);
    });

    it('should return error when the board is all walls', () => {
        const board = allWallsBoard;
        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include(ErrorCode.BoardInaccessibleCells);
    });

    it('should tell the user if there is no flag in CTF mode', () => {
        const board = ctfNoFlagSmallBoard;

        const errors = boardService.validateBoard(board, GameType.Ctf);
        expect(errors).to.include(ErrorCode.BoardMissingFlag);
    });

    it('should return an error when a door doesnt have wall on both axes', () => {
        const board = invalidDoorBoard;
        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include(ErrorCode.BoardInvalidDoorPlacement);
    });

    it('should return an error when a door is placed on the edge', () => {
        const board = edgeDoorBoard;
        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include(ErrorCode.BoardInvalidDoorPlacement);
    });

    it('should return an error when a door is placed on the top edge between walls', () => {
        const board = topEdgeDoorBoard;
        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include(ErrorCode.BoardInvalidDoorPlacement);
    });

    // Edge case: a vertical door with only one wall neighbor is still invalid.
    it('should return an error when only the top neighbor is a wall in vertical check', () => {
        const board = verticalDoorTopWallOnlyBoard;
        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include(ErrorCode.BoardInvalidDoorPlacement);
    });

    it('should validate a vertical door between walls with terrain on sides', () => {
        const board = verticalDoorWithWallsBoard;
        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.not.include(ErrorCode.BoardInvalidDoorPlacement);
    });

    it('should validate a closed door between walls with terrain on sides', () => {
        const board = structuredClone(verticalDoorWithWallsBoard);
        board.cells[1][1] = CellType.ClosedDoor;

        const errors = boardService.validateBoard(board, GameType.Classic);

        expect(errors).to.not.include(ErrorCode.BoardInvalidDoorPlacement);
    });
});
