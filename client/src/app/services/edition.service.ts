import { Injectable } from '@angular/core';
import { CellType } from '@common/board';
import { GameType, IExistingGame } from '@common/game';
import { IItem, ItemType, SANCTUARY_SIZE, SMALL_ITEM_SIZE } from '@common/items';

export type Tool = 'placement' | 'objects' | 'erase';

enum GridSize {
    SMALL = 10,
    MEDIUM = 15,
    LARGE = 20,
}

export enum ToolOption {
    Placement = 'placement',
    Objects = 'objects',
}

@Injectable({
    providedIn: 'root',
})
export class BoardEditorService {
    itemTypesLabels: { [key in ItemType]: string } = {
        [ItemType.LifeSanctuary]: 'Sanctuaire de vie',
        [ItemType.FightSanctuary]: 'Sanctuaire de combat',
        [ItemType.StartingPosition]: "Point d'apparition",
        [ItemType.Flag]: 'Drapeau',
    };

    availableCellTypes = [CellType.Empty, CellType.Ice, CellType.Water, CellType.Wall, CellType.OpenDoor];

    cellTypesLabels: { [key in CellType]: string } = {
        [CellType.Empty]: 'Gazon',
        [CellType.Ice]: 'Glace',
        [CellType.Water]: 'Eau',
        [CellType.Wall]: 'Mur',
        [CellType.OpenDoor]: 'Porte',
        [CellType.ClosedDoor]: 'Porte',
    };

    availableTools = Object.values(ToolOption);
    availableToolsIcons: { [key in ToolOption]: string } = {
        [ToolOption.Placement]: 'assets/edit-page/cursor.svg',
        [ToolOption.Objects]: 'assets/edit-page/cube.svg',
    };

    gameCells: CellType[][] = [];
    objects: IItem[] = [];
    gameMode: GameType;

    activeTool: Tool = ToolOption.Placement;
    selectedMaterial: CellType = CellType.Empty;
    selectedObject: ItemType | null;

    objectSizesMap = {
        [ItemType.LifeSanctuary]: SANCTUARY_SIZE,
        [ItemType.FightSanctuary]: SANCTUARY_SIZE,
        [ItemType.StartingPosition]: SMALL_ITEM_SIZE,
        [ItemType.Flag]: SMALL_ITEM_SIZE,
    };

    sanctuaryMaxAmount = 1;
    spawnpointMaxAmount = 2;
    flagMaxAmount = 1;

    blockingCells = new Set<CellType>([CellType.Wall, CellType.Water, CellType.OpenDoor, CellType.ClosedDoor]);

    initFromExistingBoard(game: IExistingGame): void {
        this.gameCells = structuredClone(game.board.cells);
        this.objects = structuredClone(game.board.items);
        this.gameMode = game.gameMode;
    }

    buildGrid(size: number): void {
        this.gameCells = Array.from({ length: size }, () => Array.from({ length: size }, () => CellType.Empty));

        this.objects = [];

        this.updateMaxAmount();
    }

    cellBelongsToObject(obj: IItem, row: number, col: number): boolean {
        if (obj.itemType === ItemType.LifeSanctuary || obj.itemType === ItemType.FightSanctuary) {
            return row >= obj.x && row <= obj.x + 1 && col >= obj.y && col <= obj.y + 1;
        }
        return obj.x === row && obj.y === col;
    }

    isCellOccupied(row: number, col: number): boolean {
        return this.objects.some((obj) => this.cellBelongsToObject(obj, row, col));
    }

    getObjectAt(row: number, col: number): IItem | null {
        return this.objects.find((obj) => this.cellBelongsToObject(obj, row, col)) ?? null;
    }

    updateMaxAmount() {
        if (this.gameCells.length === GridSize.SMALL) {
            this.sanctuaryMaxAmount = 1;
            this.spawnpointMaxAmount = 2;
        } else if (this.gameCells.length === GridSize.MEDIUM) {
            this.sanctuaryMaxAmount = 2;
            this.spawnpointMaxAmount = 4;
        } else if (this.gameCells.length === GridSize.LARGE) {
            this.sanctuaryMaxAmount = 4;
            this.spawnpointMaxAmount = 6;
        }
    }

    setGrid(size: number): void {
        if (this.isBoardFilled()) {
            const confirmChange = confirm('Changing the grid size will erase your progress. Save first to not lose progress');
            if (!confirmChange) {
                return;
            }
        }
        this.resetGrid();
        this.buildGrid(size);
    }

    changeGameMode(nextMode: GameType): void {
        this.selectedObject = null;

        if (nextMode !== GameType.Ctf) {
            this.objects = this.objects.filter((obj) => obj.itemType !== ItemType.Flag);
        }
        this.gameMode = nextMode;
    }

    revertGrid(game: IExistingGame): void {
        this.initFromExistingBoard(structuredClone(game));
    }

    applyTile(rowIndex: number, index: number): void {
        if (this.activeTool !== ToolOption.Placement) return;

        if (this.selectedMaterial === CellType.OpenDoor) {
            this.gameCells[rowIndex][index] = this.gameCells[rowIndex][index] === CellType.OpenDoor ? CellType.ClosedDoor : CellType.OpenDoor;
            return;
        }

        if (this.blockingCells.has(this.selectedMaterial) && this.isCellOccupied(rowIndex, index)) {
            this.eraseObject(rowIndex, index);
            this.gameCells[rowIndex][index] = this.selectedMaterial;
        }

        this.gameCells[rowIndex][index] = this.selectedMaterial;
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
        const obj = this.objects.find((o) => this.cellBelongsToObject(o, row, col));

        if (!obj) return;

        this.objects = this.objects.filter((o) => o !== obj);
    }

    resetGrid(): void {
        this.buildGrid(this.gameCells.length);
    }

    isBoardFilled(): boolean {
        return this.gameCells.some((row) => {
            return row.some((cell) => cell !== CellType.Empty);
        });
    }

    getSanctuaryBgPosition(row: number, col: number): string | null {
        const sanctuary = this.objects.find(
            (obj) => (obj.itemType === ItemType.LifeSanctuary || obj.itemType === ItemType.FightSanctuary) && this.cellBelongsToObject(obj, row, col),
        );

        if (!sanctuary) return null;

        if (row === sanctuary.x && col === sanctuary.y) return '0% 0%';

        if (row === sanctuary.x && col === sanctuary.y + 1) return '100% 0%';

        if (row === sanctuary.x + 1 && col === sanctuary.y) return '0% 100%';

        return '100% 100%';
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
