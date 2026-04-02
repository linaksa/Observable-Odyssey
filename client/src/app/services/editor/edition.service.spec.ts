/**
 * Testing strategy — Edition Service
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
import { TestBed } from '@angular/core/testing';
import {
    GridSize,
    MAX_SANCTUARY_AMOUNT_LARGE,
    MAX_SANCTUARY_AMOUNT_MEDIUM,
    MAX_SANCTUARY_AMOUNT_SMALL,
    ToolOption,
} from '@app/constants/grid-edition';
import { ITEM_INFO_BY_TYPE, TILE_INFO_BY_TYPE } from '@app/constants/tile-info';
import { BoardSharedService } from '@app/services/shared/board-shared.service';
import { CellType } from '@common/board';
import { GameType, IExistingGame, Visibility } from '@common/game';
import { IItem, ItemType, SANCTUARY_SIZE } from '@common/items';
import { BoardEditorService } from './edition.service';

const TEST_GRID_SIZE = 5;

describe('BoardEditorService', () => {
    let service: BoardEditorService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [BoardEditorService, BoardSharedService],
        });

        service = TestBed.inject(BoardEditorService);
    });

    // Edge case: When required input data is missing, build an empty grid and clear placed objects.
    it('should build an empty grid and clear placed objects', () => {
        service.objects = [createItem(ItemType.Flag, 0, 0, 1)];

        service.buildGrid(GridSize.SMALL);

        expect(service.gameCells.length).toBe(GridSize.SMALL);
        expect(service.gameCells[0].length).toBe(GridSize.SMALL);
        expect(service.gameCells[2][2]).toBe(CellType.Empty);
        expect(service.objects).toEqual([]);
    });

    it('should place a closed door on a valid horizontal corridor and toggle it on repeated placement', () => {
        service.buildGrid(TEST_GRID_SIZE);
        service.activeTool = ToolOption.Placement;
        service.selectedMaterial = CellType.ClosedDoor;
        service.objects = [createItem(ItemType.StartingPosition, 2, 2, 1)];
        const eraseSpy = spyOn(service, 'eraseObject').and.callThrough();

        service.gameCells[2][1] = CellType.Wall;
        service.gameCells[2][3] = CellType.Wall;
        service.gameCells[1][2] = CellType.Ice;
        service.gameCells[3][2] = CellType.Water;

        service.applyTile(2, 2);
        expect(service.gameCells[2][2]).toBe(CellType.ClosedDoor);
        expect(eraseSpy).toHaveBeenCalledWith(2, 2);

        service.applyTile(2, 2);
        expect(service.gameCells[2][2]).toBe(CellType.OpenDoor);
    });

    it('should expose closed doors in the placement palette', () => {
        expect(service.availableCellTypes).toContain(CellType.ClosedDoor);
        expect(service.availableCellTypes).not.toContain(CellType.OpenDoor);
    });

    it('should place a closed door on a valid vertical corridor', () => {
        service.buildGrid(TEST_GRID_SIZE);
        service.activeTool = ToolOption.Placement;
        service.selectedMaterial = CellType.ClosedDoor;

        service.gameCells[1][2] = CellType.Wall;
        service.gameCells[3][2] = CellType.Wall;
        service.gameCells[2][1] = CellType.Empty;
        service.gameCells[2][3] = CellType.Ice;

        service.applyTile(2, 2);

        expect(service.gameCells[2][2]).toBe(CellType.ClosedDoor);
    });

    it('should place doors on the edge of the board', () => {
        service.buildGrid(TEST_GRID_SIZE);
        service.activeTool = ToolOption.Placement;
        service.selectedMaterial = CellType.ClosedDoor;
        service.objects = [createItem(ItemType.Flag, 1, 0, 1)];
        const eraseSpy = spyOn(service, 'eraseObject').and.callThrough();

        service.gameCells[0][0] = CellType.Wall;
        service.gameCells[0][2] = CellType.Wall;
        service.gameCells[1][1] = CellType.Empty;

        service.applyTile(0, 1);

        expect(service.gameCells[0][1]).toBe(CellType.ClosedDoor);
        expect(service.objects).toEqual([]);
        expect(eraseSpy).toHaveBeenCalledWith(0, 1);
    });

    it('should place doors even when the surrounding layout is not valid', () => {
        service.buildGrid(TEST_GRID_SIZE);
        service.activeTool = ToolOption.Placement;
        service.selectedMaterial = CellType.ClosedDoor;
        service.objects = [createItem(ItemType.Flag, 2, 2, 1)];
        const eraseSpy = spyOn(service, 'eraseObject').and.callThrough();

        service.gameCells[2][1] = CellType.Wall;
        service.gameCells[2][3] = CellType.Wall;
        service.gameCells[1][2] = CellType.Wall;
        service.gameCells[3][2] = CellType.Wall;

        service.applyTile(2, 2);

        expect(service.gameCells[2][2]).toBe(CellType.ClosedDoor);
        expect(service.objects).toEqual([]);
        expect(eraseSpy).toHaveBeenCalledWith(2, 2);
    });

    // Edge case: When placement tool is inactive, it should not apply tile.
    it('should not apply tile when placement tool is inactive', () => {
        service.buildGrid(2);
        service.activeTool = ToolOption.Objects;
        service.selectedMaterial = CellType.Wall;

        service.applyTile(0, 1);

        expect(service.gameCells[0][1]).toBe(CellType.Empty);
    });

    // Edge case: When applying a blocking tile, erase occupying object.
    it('should erase occupying object when applying a blocking tile', () => {
        service.buildGrid(GridSize.SMALL);
        service.activeTool = ToolOption.Placement;
        service.selectedMaterial = CellType.Wall;
        service.objects = [createItem(ItemType.Flag, 0, 0, 1)];

        service.applyTile(0, 0);

        expect(service.objects).toEqual([]);
        expect(service.gameCells[0][0]).toBe(CellType.Wall);
    });

    // Edge case: When tool is invalid, object missing, or cell is occupied, ignore object placement.
    it('should ignore object placement when tool is invalid, object missing, or cell is occupied', () => {
        service.buildGrid(GridSize.SMALL);
        service.activeTool = ToolOption.Placement;
        service.selectedObject = ItemType.Flag;
        service.applyObject(0, 0);
        expect(service.objects).toEqual([]);

        service.activeTool = ToolOption.Objects;
        service.selectedObject = null;
        service.applyObject(0, 0);
        expect(service.objects).toEqual([]);

        service.selectedObject = ItemType.Flag;
        service.objects = [createItem(ItemType.StartingPosition, 0, 0, 1)];
        service.applyObject(0, 0);
        expect(service.getObjectCount(ItemType.Flag)).toBe(0);
    });

    it('should place a non-sanctuary object only on free walkable cells', () => {
        service.buildGrid(GridSize.SMALL);
        service.activeTool = ToolOption.Objects;
        service.selectedObject = ItemType.Flag;

        service.gameCells[0][0] = CellType.Wall;
        service.applyObject(0, 0);
        expect(service.objects).toEqual([]);

        service.gameCells[0][0] = CellType.Empty;
        service.applyObject(0, 0);

        expect(service.objects).toEqual([createItem(ItemType.Flag, 0, 0, 1)]);
    });

    it('should enforce maximum flag amount', () => {
        service.buildGrid(GridSize.SMALL);
        service.activeTool = ToolOption.Objects;
        service.selectedObject = ItemType.Flag;

        service.applyObject(0, 0);
        service.applyObject(0, 1);

        expect(service.getObjectCount(ItemType.Flag)).toBe(1);
    });

    it('should delegate sanctuary placement to placeSanctuary', () => {
        service.buildGrid(GridSize.SMALL);
        service.activeTool = ToolOption.Objects;
        service.selectedObject = ItemType.LifeSanctuary;
        const sanctuarySpy = spyOn(service, 'placeSanctuary').and.callThrough();

        service.applyObject(0, 0);

        expect(sanctuarySpy).toHaveBeenCalledWith(0, 0);
    });

    it('should enforce starting position limits based on board size', () => {
        service.buildGrid(GridSize.SMALL);
        service.activeTool = ToolOption.Objects;
        service.selectedObject = ItemType.StartingPosition;
        const maxSpawnPoints = service.getRemainingObjectCount(ItemType.StartingPosition);

        for (let i = 0; i < maxSpawnPoints + 1; i++) {
            service.applyObject(0, i);
        }

        expect(service.getObjectCount(ItemType.StartingPosition)).toBe(maxSpawnPoints);
    });

    it('should place sanctuary only when area is valid and available', () => {
        service.buildGrid(GridSize.SMALL);
        service.selectedObject = ItemType.LifeSanctuary;

        service.placeSanctuary(GridSize.SMALL - 1, GridSize.SMALL - 1);
        expect(service.objects).toEqual([]);

        service.gameCells[0][1] = CellType.Wall;
        service.placeSanctuary(0, 0);
        expect(service.objects).toEqual([]);

        service.gameCells[0][1] = CellType.Empty;
        service.placeSanctuary(0, 0);

        expect(service.objects).toEqual([
            {
                itemType: ItemType.LifeSanctuary,
                x: 0,
                y: 0,
                size: SANCTUARY_SIZE,
            },
        ]);
    });

    it('should report invalid sanctuary placement when the area overlaps a blocking cell', () => {
        service.buildGrid(GridSize.SMALL);
        service.selectedObject = ItemType.LifeSanctuary;
        service.gameCells[0][1] = CellType.Wall;

        expect(service.isSelectedObjectPlacementPositionValid(0, 0)).toBeFalse();
    });

    // Edge case: When no sanctuary object is selected, it should not place sanctuary.
    it('should not place sanctuary when no sanctuary object is selected', () => {
        service.buildGrid(GridSize.SMALL);
        service.selectedObject = null;

        service.placeSanctuary(0, 0);

        expect(service.objects).toEqual([]);
    });

    // Edge case: Sanctuaries still have a maximum amount even if they are optional.
    it('should not place sanctuary when max amount is reached for life and fight sanctuaries', () => {
        service.buildGrid(GridSize.MEDIUM);
        service.selectedObject = ItemType.LifeSanctuary;
        const maxSanctuaries = MAX_SANCTUARY_AMOUNT_MEDIUM;

        service.objects = Array.from({ length: maxSanctuaries }, (_, index) => createItem(ItemType.LifeSanctuary, index, index, SANCTUARY_SIZE));
        service.placeSanctuary(0, 0);
        expect(service.getObjectCount(ItemType.LifeSanctuary)).toBe(maxSanctuaries);

        service.selectedObject = ItemType.FightSanctuary;
        service.objects = Array.from({ length: maxSanctuaries }, (_, index) => createItem(ItemType.FightSanctuary, index, index, SANCTUARY_SIZE));
        service.placeSanctuary(0, 0);
        expect(service.getObjectCount(ItemType.FightSanctuary)).toBe(maxSanctuaries);
    });

    // Edge case: When sanctuary placement preconditions are not met (occupied cells), placement should be rejected.
    it('should not place sanctuary on already occupied cells', () => {
        service.buildGrid(GridSize.SMALL);
        service.selectedObject = ItemType.FightSanctuary;
        service.objects = [createItem(ItemType.Flag, 0, 0, 1)];

        service.placeSanctuary(0, 0);

        expect(service.getObjectCount(ItemType.FightSanctuary)).toBe(0);
    });

    it('should erase tile content explicitly', () => {
        service.buildGrid(GridSize.SMALL);
        service.gameCells[1][1] = CellType.Ice;

        service.eraseTile(1, 1);

        expect(service.gameCells[1][1]).toBe(CellType.Empty);
    });

    it('should remove object that overlaps the erased cell', () => {
        service.objects = [createItem(ItemType.StartingPosition, 0, 0, 1), createItem(ItemType.Flag, 1, 1, 1)];

        service.eraseObject(0, 0);

        expect(service.objects).toEqual([createItem(ItemType.Flag, 1, 1, 1)]);
    });

    it('should compute remaining counts according to board size limits', () => {
        service.buildGrid(GridSize.MEDIUM);
        service.objects = [
            createItem(ItemType.StartingPosition, 0, 0, 1),
            createItem(ItemType.StartingPosition, 0, 1, 1),
            createItem(ItemType.Flag, 1, 0, 1),
        ];

        expect(service.getRemainingObjectCount(ItemType.StartingPosition)).toBe(2);
        expect(service.getRemainingObjectCount(ItemType.Flag)).toBe(0);
    });

    it('should keep sanctuaries optional across all grid sizes', () => {
        service.buildGrid(GridSize.SMALL);
        expect(service.getRemainingObjectCount(ItemType.LifeSanctuary)).toBe(MAX_SANCTUARY_AMOUNT_SMALL);
        expect(service.getRemainingObjectCount(ItemType.FightSanctuary)).toBe(MAX_SANCTUARY_AMOUNT_SMALL);
        expect(service.getRemainingObjectCount(ItemType.StartingPosition)).toBeGreaterThan(0);

        service.buildGrid(GridSize.LARGE);
        expect(service.getRemainingObjectCount(ItemType.LifeSanctuary)).toBe(MAX_SANCTUARY_AMOUNT_LARGE);
        expect(service.getRemainingObjectCount(ItemType.FightSanctuary)).toBe(MAX_SANCTUARY_AMOUNT_LARGE);
        expect(service.getRemainingObjectCount(ItemType.StartingPosition)).toBeGreaterThan(0);
    });

    it('should expose the base object types in classic mode', () => {
        service.gameMode = GameType.Classic;

        expect(service.availableObjectTypes()).toEqual([ItemType.LifeSanctuary, ItemType.FightSanctuary, ItemType.StartingPosition]);
    });

    it('should expose the flag in capture-the-flag mode', () => {
        service.gameMode = GameType.Ctf;

        expect(service.availableObjectTypes()).toEqual([ItemType.LifeSanctuary, ItemType.FightSanctuary, ItemType.StartingPosition, ItemType.Flag]);
    });

    it('should expose shared tile and item info records', () => {
        expect(service.cellTypesInfo).toBe(TILE_INFO_BY_TYPE);
        expect(service.itemTypesInfo).toBe(ITEM_INFO_BY_TYPE);
    });

    it('should return zero remaining amount for unsupported object type', () => {
        service.buildGrid(GridSize.SMALL);

        expect(service.getRemainingObjectCount('unknown-item' as unknown as ItemType)).toBe(0);
    });

    it('should restore board state from a provided game', () => {
        const game = createGame(GridSize.SMALL, [createItem(ItemType.Flag, 1, 1, 1)]);

        service.revertGrid(game);

        expect(service.gameCells).toEqual(game.board.cells);
        expect(service.objects).toEqual(game.board.items);
        expect(service.gameMode).toBe(GameType.Classic);
    });
});

function createGame(size: number, items: IItem[] = []): IExistingGame {
    return {
        _id: 'game-1',
        gameTitle: 'Edition test game',
        description: '',
        board: {
            cells: Array.from({ length: size }, () => Array.from({ length: size }, () => CellType.Empty)),
            items,
        },
        gameMode: GameType.Classic,
        dateCreated: new Date('2026-01-01T00:00:00.000Z'),
        lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
        visibility: Visibility.Hidden,
    };
}

function createItem(itemType: ItemType, x: number, y: number, size: number): IItem {
    return {
        itemType,
        x,
        y,
        size,
    };
}
