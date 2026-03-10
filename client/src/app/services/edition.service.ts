import { inject, Injectable } from '@angular/core';
import { GridSize, ToolOption } from '@app/constants/grid-edition';
import { BoardSharedService } from '@app/services/shared/boardShared.service';
import { CellType } from '@common/board';
import { GameType, IExistingGame } from '@common/game';
import { IItem, ItemType, SANCTUARY_SIZE, SMALL_ITEM_SIZE } from '@common/items';

const MAX_SANCTUARY_AMOUNT_LARGE = 4;
const MAX_SANCTUARY_AMOUNT_MEDIUM = 2;
const MAX_SANCTUARY_AMOUNT_SMALL = 1;

const MAX_SPAWNPOINT_AMOUNT_LARGE = 6;
const MAX_SPAWNPOINT_AMOUNT_MEDIUM = 4;
const MAX_SPAWNPOINT_AMOUNT_SMALL = 2;
const MAX_FLAG_AMOUNT = 1;

@Injectable({
    providedIn: 'root',
})
export class BoardEditorService {
    availableCellTypes = [CellType.Empty, CellType.Ice, CellType.Water, CellType.Wall, CellType.OpenDoor];

    availableTools = Object.values(ToolOption);
    availableToolsIcons: { [key in ToolOption]: string } = {
        [ToolOption.Placement]: './assets/edit-page/tools/cursor.svg',
        [ToolOption.Objects]: './assets/edit-page/tools/cube.svg',
    };

    boardSharedService: BoardSharedService = inject(BoardSharedService);

    gameCells: CellType[][] = [];
    objects: IItem[] = [];
    gameMode: GameType;

    activeTool: ToolOption = ToolOption.Placement;
    selectedMaterial: CellType = CellType.Empty;
    selectedObject: ItemType | null;

    objectSizesMap = {
        [ItemType.LifeSanctuary]: SANCTUARY_SIZE,
        [ItemType.FightSanctuary]: SANCTUARY_SIZE,
        [ItemType.StartingPosition]: SMALL_ITEM_SIZE,
        [ItemType.Flag]: SMALL_ITEM_SIZE,
    };

    private get sanctuaryMaxAmount(): number {
        if (this.gameCells.length === GridSize.SMALL) return MAX_SANCTUARY_AMOUNT_SMALL;
        if (this.gameCells.length === GridSize.MEDIUM) return MAX_SANCTUARY_AMOUNT_MEDIUM;
        return MAX_SANCTUARY_AMOUNT_LARGE;
    }

    private get spawnpointMaxAmount(): number {
        if (this.gameCells.length === GridSize.SMALL) return MAX_SPAWNPOINT_AMOUNT_SMALL;
        if (this.gameCells.length === GridSize.MEDIUM) return MAX_SPAWNPOINT_AMOUNT_MEDIUM;
        return MAX_SPAWNPOINT_AMOUNT_LARGE;
    }

    private get flagMaxAmount(): number {
        return MAX_FLAG_AMOUNT;
    }

    private blockingCells = new Set<CellType>([CellType.Wall, CellType.OpenDoor, CellType.ClosedDoor]);

    initFromExistingBoard(game: IExistingGame): void {
        this.gameCells = structuredClone(game.board.cells);
        this.objects = structuredClone(game.board.items);
        this.gameMode = game.gameMode;
    }

    buildGrid(size: number): void {
        this.gameCells = Array.from({ length: size }, () => Array.from({ length: size }, () => CellType.Empty));

        this.objects = [];
    }

    isCellOccupied(row: number, col: number): boolean {
        return this.objects.some((obj) => this.boardSharedService.cellBelongsToObject(obj, row, col));
    }

    revertGrid(game: IExistingGame): void {
        this.initFromExistingBoard(structuredClone(game));
    }

    applyTile(rowIndex: number, colIndex: number): void {
        if (this.activeTool !== ToolOption.Placement) return;

        if (this.selectedMaterial === CellType.OpenDoor) {
            this.eraseObject(rowIndex, colIndex);
            this.gameCells[rowIndex][colIndex] = this.gameCells[rowIndex][colIndex] === CellType.OpenDoor ? CellType.ClosedDoor : CellType.OpenDoor;
            return;
        }

        if (this.blockingCells.has(this.selectedMaterial) && this.isCellOccupied(rowIndex, colIndex)) {
            this.eraseObject(rowIndex, colIndex);
            this.gameCells[rowIndex][colIndex] = this.selectedMaterial;
        }

        this.gameCells[rowIndex][colIndex] = this.selectedMaterial;
    }

    applyObject(rowIndex: number, colIndex: number): void {
        if (this.activeTool !== ToolOption.Objects || !this.selectedObject) return;

        if (this.blockingCells.has(this.gameCells[rowIndex][colIndex])) return;

        if (this.selectedObject === ItemType.LifeSanctuary || this.selectedObject === ItemType.FightSanctuary) {
            this.placeSanctuary(rowIndex, colIndex);
            return;
        }

        if (this.isCellOccupied(rowIndex, colIndex)) return;

        if (this.selectedObject === ItemType.Flag) {
            if (this.getObjectCount(ItemType.Flag) >= this.flagMaxAmount) return;
        }

        if (this.selectedObject === ItemType.StartingPosition) {
            if (this.getObjectCount(ItemType.StartingPosition) >= this.spawnpointMaxAmount) return;
        }

        this.objects.push({
            itemType: this.selectedObject,
            x: rowIndex,
            y: colIndex,
            size: this.objectSizesMap[this.selectedObject],
        });
    }

    placeSanctuary(rowIndex: number, colIndex: number): void {
        if (this.selectedObject === null) return;

        if (this.selectedObject === ItemType.LifeSanctuary && this.getObjectCount(ItemType.LifeSanctuary) >= this.sanctuaryMaxAmount) return;

        if (this.selectedObject === ItemType.FightSanctuary && this.getObjectCount(ItemType.FightSanctuary) >= this.sanctuaryMaxAmount) return;

        if (rowIndex + 1 >= this.gameCells.length || colIndex + 1 >= this.gameCells.length) return;

        const cells: [number, number][] = [
            [rowIndex, colIndex],
            [rowIndex + 1, colIndex],
            [rowIndex, colIndex + 1],
            [rowIndex + 1, colIndex + 1],
        ];

        if (cells.some(([row, col]) => this.isCellOccupied(row, col))) return;

        if (cells.some(([row, col]) => this.blockingCells.has(this.gameCells[row][col]))) return;
        this.objects.push({ itemType: this.selectedObject, x: rowIndex, y: colIndex, size: SANCTUARY_SIZE });

        return;
    }

    eraseTile(row: number, col: number): void {
        this.gameCells[row][col] = CellType.Empty;
    }

    eraseObject(row: number, col: number): void {
        const obj = this.objects.find((o) => this.boardSharedService.cellBelongsToObject(o, row, col));

        if (!obj) return;

        this.objects = this.objects.filter((o) => o !== obj);
    }

    getObjectCount(itemType: ItemType): number {
        return this.objects.filter((obj) => obj.itemType === itemType).length;
    }

    getRemainingObjectCount(itemType: ItemType): number {
        switch (itemType) {
            case ItemType.LifeSanctuary:
                return this.sanctuaryMaxAmount - this.getObjectCount(ItemType.LifeSanctuary);
            case ItemType.FightSanctuary:
                return this.sanctuaryMaxAmount - this.getObjectCount(ItemType.FightSanctuary);
            case ItemType.StartingPosition:
                return this.spawnpointMaxAmount - this.getObjectCount(ItemType.StartingPosition);
            case ItemType.Flag:
                return this.flagMaxAmount - this.getObjectCount(ItemType.Flag);
            default:
                return 0;
        }
    }
}
