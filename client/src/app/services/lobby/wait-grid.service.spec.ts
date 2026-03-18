/**
 * Testing strategy — Wait Grid Service
 *
 * Approach:
 * - Validate board initialization from active-game payloads with deep-copy assertions.
 * - Validate grid construction behavior for valid and invalid sizes.
 * - Keep tests data-driven using small board fixtures and deterministic item factories.
 *
 * Edge cases covered:
 * - Missing game payload should keep prior state intact.
 * - Missing board/cells/items should safely fallback without throwing.
 * - Non-positive size should clear grid/object state.
 */
import { TestBed } from '@angular/core/testing';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { IItem, ItemType, SMALL_ITEM_SIZE } from '@common/items';
import { WaitGridService } from './wait-grid.service';

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
