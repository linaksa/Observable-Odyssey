/**
 * Testing strategy — WaitGridService
 *
 * Approach:
 * - Initialize the grid from active-game payloads and assert deep-copy behavior for cells/items.
 * - Validate explicit build/clear operations with deterministic board-size fixtures.
 *
 * Edge cases covered:
 * - Missing game or board data keeps existing state stable and avoids runtime errors.
 * - Non-positive size input clears both cells and placed objects.
 */
import { TestBed } from '@angular/core/testing';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { IItem, ItemType, SMALL_ITEM_SIZE } from '@common/items';
import { WaitGridService } from '@app/services/lobby/wait-grid.service';

describe('WaitGridService', () => {
    let service: WaitGridService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(WaitGridService);
    });

    it('should clone board cells and objects from an existing game', () => {
        const sourceItem = createItem(ItemType.Flag, 0, 1);
        const game = createActiveGame({
            cells: [[CellType.Empty, CellType.Water]],
            items: [sourceItem],
        });

        service.initFromExistingBoard(game);

        expect(service.gameCells).toEqual(game.game.board.cells);
        expect(service.objects).toEqual(game.game.board.items);
        expect(service.gameCells).not.toBe(game.game.board.cells);
        expect(service.objects).not.toBe(game.game.board.items);
    });

    // Edge case: When initFromExistingBoard receives no game, keep current state.
    it('should keep current state when initFromExistingBoard receives no game', () => {
        const existingItem = createItem(ItemType.Flag, 1, 1);
        service.gameCells = [[CellType.Ice]];
        service.objects = [existingItem];

        service.initFromExistingBoard(undefined as unknown as IActiveGame);

        expect(service.gameCells).toEqual([[CellType.Ice]]);
        expect(service.objects).toEqual([existingItem]);
    });

    // Edge case: When board cells or items are undefined, fall back to empty arrays.
    it('should fallback to empty arrays when board cells or items are undefined', () => {
        const game = {
            game: {
                board: {
                    cells: undefined,
                    items: undefined,
                },
            },
        } as unknown as IActiveGame;

        service.initFromExistingBoard(game);

        expect(service.gameCells).toEqual([]);
        expect(service.objects).toEqual([]);
    });

    // Edge case: When game board is missing, keep current state.
    it('should keep current state when game board is missing', () => {
        service.gameCells = [[CellType.Water]];
        service.objects = [createItem(ItemType.Flag, 0, 0)];

        service.initFromExistingBoard({ game: {} } as unknown as IActiveGame);

        expect(service.gameCells).toEqual([[CellType.Water]]);
        expect(service.objects.length).toBe(1);
    });

    // Edge case: When size is not positive, clear grid.
    it('should clear grid when size is not positive', () => {
        service.gameCells = [[CellType.Ice]];
        service.objects = [createItem(ItemType.Flag, 0, 0)];

        service.buildGrid(0);

        expect(service.gameCells).toEqual([]);
        expect(service.objects).toEqual([]);
    });

    it('should build an empty square grid when size is valid', () => {
        const gridSize = 3;

        service.buildGrid(gridSize);

        expect(service.gameCells.length).toBe(gridSize);
        expect(service.gameCells.every((row) => row.length === gridSize)).toBeTrue();
        expect(service.gameCells.flat().every((cell) => cell === CellType.Empty)).toBeTrue();
        expect(service.objects).toEqual([]);
    });
});

function createActiveGame(board: { cells: CellType[][]; items: IItem[] }): IActiveGame {
    return {
        game: { board },
    } as unknown as IActiveGame;
}

function createItem(itemType: ItemType, x: number, y: number): IItem {
    return {
        itemType,
        x,
        y,
        size: SMALL_ITEM_SIZE,
    };
}
