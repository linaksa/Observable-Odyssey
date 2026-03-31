import { computed, inject, Injectable, signal } from '@angular/core';
import {
    GridSize,
    MAX_FLAG_AMOUNT,
    MAX_SANCTUARY_AMOUNT_LARGE,
    MAX_SANCTUARY_AMOUNT_MEDIUM,
    MAX_SANCTUARY_AMOUNT_SMALL,
    MAX_SPAWNPOINT_AMOUNT_LARGE,
    MAX_SPAWNPOINT_AMOUNT_MEDIUM,
    MAX_SPAWNPOINT_AMOUNT_SMALL,
    ToolOption,
} from '@app/constants/grid-edition';
import { ITEM_INFO_BY_TYPE, TILE_INFO_BY_TYPE } from '@app/constants/tile-info';
import { BoardSharedService } from '@app/services/shared/board-shared.service';
import { CellType } from '@common/board';
import { GameType, IExistingGame } from '@common/game';
import { IItem, ItemType, SANCTUARY_SIZE, SMALL_ITEM_SIZE } from '@common/items';

@Injectable({
    providedIn: 'root',
})
export class BoardEditorService {
    private readonly gameCellsState = signal<CellType[][]>([]);
    private readonly objectsState = signal<IItem[]>([]);
    private readonly gameModeState = signal<GameType>(GameType.Classic);
    private readonly activeToolState = signal<ToolOption>(ToolOption.Placement);
    private readonly selectedMaterialState = signal<CellType>(CellType.Empty);
    private readonly selectedObjectState = signal<ItemType | null>(null);

    availableCellTypes = [CellType.Empty, CellType.Ice, CellType.Water, CellType.Wall, CellType.ClosedDoor];
    readonly cellTypesInfo = TILE_INFO_BY_TYPE;
    readonly itemTypesInfo = ITEM_INFO_BY_TYPE;

    readonly availableObjectTypes = computed<ItemType[]>(() => {
        const baseObjectTypes = [ItemType.LifeSanctuary, ItemType.FightSanctuary, ItemType.StartingPosition];

        if (this.gameMode === GameType.Ctf) {
            return [...baseObjectTypes, ItemType.Flag];
        }

        return baseObjectTypes;
    });

    availableTools = Object.values(ToolOption);

    boardSharedService: BoardSharedService = inject(BoardSharedService);

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

    get gameCells(): CellType[][] {
        return this.gameCellsState();
    }

    set gameCells(value: CellType[][]) {
        this.gameCellsState.set(value);
    }

    get objects(): IItem[] {
        return this.objectsState();
    }

    set objects(value: IItem[]) {
        this.objectsState.set(value);
    }

    get gameMode(): GameType {
        return this.gameModeState();
    }

    set gameMode(value: GameType) {
        this.gameModeState.set(value);
    }

    get activeTool(): ToolOption {
        return this.activeToolState();
    }

    set activeTool(value: ToolOption) {
        this.activeToolState.set(value);
    }

    get selectedMaterial(): CellType {
        return this.selectedMaterialState();
    }

    set selectedMaterial(value: CellType) {
        this.selectedMaterialState.set(value);
    }

    get selectedObject(): ItemType | null {
        return this.selectedObjectState();
    }

    set selectedObject(value: ItemType | null) {
        this.selectedObjectState.set(value);
    }

    initFromExistingBoard(game: IExistingGame): void {
        this.gameCells = structuredClone(game.board.cells);
        this.objects = structuredClone(game.board.items);
        this.gameMode = game.gameMode;
    }

    readonly getObjectAt = (row: number, col: number): IItem | null => {
        return this.boardSharedService.getObjectAt(row, col, this.objects);
    };

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

        const selectedMaterial = this.selectedMaterial;
        const updatedGameCells = this.cloneGameCells();

        if (this.isDoorMaterial(selectedMaterial)) {
            const currentCell = this.gameCells[rowIndex][colIndex];

            if (this.isDoorCell(currentCell)) {
                updatedGameCells[rowIndex][colIndex] = this.toggleDoorState(currentCell);
                this.gameCells = updatedGameCells;
                return;
            }

            if (this.isCellOccupied(rowIndex, colIndex)) {
                this.eraseObject(rowIndex, colIndex);
            }

            updatedGameCells[rowIndex][colIndex] = CellType.ClosedDoor;
            this.gameCells = updatedGameCells;
            return;
        }

        if (this.blockingCells.has(selectedMaterial) && this.isCellOccupied(rowIndex, colIndex)) {
            this.eraseObject(rowIndex, colIndex);
        }

        updatedGameCells[rowIndex][colIndex] = selectedMaterial;
        this.gameCells = updatedGameCells;
    }

    applyObject(rowIndex: number, colIndex: number): void {
        if (this.activeTool !== ToolOption.Objects || !this.selectedObject) return;

        const selectedObject = this.selectedObject;

        if (this.blockingCells.has(this.gameCells[rowIndex][colIndex])) return;

        if (selectedObject === ItemType.LifeSanctuary || selectedObject === ItemType.FightSanctuary) {
            this.placeSanctuary(rowIndex, colIndex);
            return;
        }

        if (this.isCellOccupied(rowIndex, colIndex)) return;

        if (selectedObject === ItemType.Flag && this.getObjectCount(ItemType.Flag) >= this.flagMaxAmount) return;

        if (selectedObject === ItemType.StartingPosition && this.getObjectCount(ItemType.StartingPosition) >= this.spawnpointMaxAmount) return;

        this.objects = [
            ...this.objects,
            {
                itemType: selectedObject,
                x: colIndex,
                y: rowIndex,
                size: this.objectSizesMap[selectedObject],
            },
        ];
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

        this.objects = [...this.objects, { itemType: this.selectedObject, x: colIndex, y: rowIndex, size: SANCTUARY_SIZE }];
    }

    eraseTile(row: number, col: number): void {
        const nextGameCells = this.cloneGameCells();
        nextGameCells[row][col] = CellType.Empty;
        this.gameCells = nextGameCells;
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

    private cloneGameCells(): CellType[][] {
        return this.gameCells.map((row) => [...row]);
    }

    private isDoorMaterial(material: CellType): boolean {
        return material === CellType.OpenDoor || material === CellType.ClosedDoor;
    }

    private isDoorCell(cellType: CellType): boolean {
        return this.isDoorMaterial(cellType);
    }

    private toggleDoorState(currentCell: CellType): CellType {
        return currentCell === CellType.OpenDoor ? CellType.ClosedDoor : CellType.OpenDoor;
    }
}
