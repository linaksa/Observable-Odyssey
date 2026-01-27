import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { AdministrationService } from '@app/services/administrationService';
import { GameService } from '@app/services/game.service';
import { EditGameFormData, IExistingGame } from '@common/game';
import html2canvas from 'html2canvas-oklch';

import { CellType } from '@common/board';
import { ItemType } from '@common/items';

type Tool = 'placement' | 'objects' | 'erase';
enum GridSize {
    SMALL = 10,
    MEDIUM = 15,
    LARGE = 20,
}

@Component({
    selector: 'app-edition-page',
    imports: [CommonModule, ReactiveFormsModule, MatButtonToggleModule],
    templateUrl: './edition-page.component.html',
    styleUrl: './edition-page.component.scss',
})
export class EditionPageComponent implements OnInit {
    @Input() gameId!: string;
    adminService: AdministrationService = inject(AdministrationService);
    gameService: GameService = inject(GameService);
    formBuilder: FormBuilder = inject(FormBuilder);
    editedGame: IExistingGame;
    gameForm: FormGroup;

    importedCellType = CellType;
    importedItemType = ItemType;

    gridSize = GridSize.SMALL;
    cells: CellType[] = [];
    gameCells: CellType[][] = [[]];
    objects: (ItemType | null)[] = [];

    activeTool: Tool = 'placement';
    selectedMaterial: CellType = CellType.Empty;
    isDrawing = false;
    lastIndexes: [number, number] = [0, 0];
    selectedObject: ItemType;
    sanctuaryCoordinates: number[][] = [];
    isFlagPlaced: boolean = false;
    isCTF: boolean = false;
    healSanctuaryAmount: number = 0;
    fightSanctuaryAmount: number = 0;
    sanctuaryMaxAmount: number = 1;
    spawnpointMaxAmount: number = 2;
    spawnpointAmount: number = 0;

    blockingCells = new Set<CellType>([CellType.Wall, CellType.Water, CellType.OpenDoor, CellType.ClosedDoor]);

    constructor() {
        this.buildGrid(this.gridSize);
        this.gameForm = this.formBuilder.group({
            gameTitle: ['', Validators.required],
            description: ['', Validators.required],
        });
    }

    ngOnInit(): void {
        this.gameService.getGameById(this.gameId).subscribe((game) => {
            this.editedGame = game;
            this.gameForm.patchValue({
                gameTitle: this.editedGame?.gameTitle,
                description: this.editedGame?.description,
            });
            this.gameCells = this.editedGame?.board.cells;
        });
    }

    updateMaxAmount() {
        if (this.gridSize === GridSize.SMALL) {
            this.sanctuaryMaxAmount = 1;
            this.spawnpointMaxAmount = 2;
        }
        if (this.gridSize === GridSize.MEDIUM) {
            this.sanctuaryMaxAmount = 2;
            this.spawnpointMaxAmount = 4;
        } else if (this.gridSize === GridSize.LARGE) {
            this.sanctuaryMaxAmount = 4;
            this.spawnpointMaxAmount = 6;
        }
    }

    removeAllFlags(): void {
        this.objects = this.objects.map((obj) => (obj === 'flag' ? null : obj));
        this.isFlagPlaced = false;
    }

    changeMode(): void {
        if (this.objects.some((object) => object === 'flag' && this.isCTF)) {
            const res = confirm('Changing the mode to Normal while a flag is placed will remove it.');
            if (res) {
                this.removeAllFlags();
            } else return;
        }
        this.isCTF = !this.isCTF;
    }

    onSubmit(): void {
        const grid: HTMLElement | null = document.querySelector('#grid-container');
        if (!grid) return;
        html2canvas(grid).then((canvas) => {
            const imgData: Base64URLString = canvas.toDataURL('image/png');
            if (this.gameForm.valid) {
                const formData = this.gameForm.value;
                this.editedGame.board.cells = this.gameCells;

                const gameData: EditGameFormData = {
                    gameTitle: formData.gameTitle,
                    description: formData.description,
                    gameMode: this.editedGame.gameMode,
                    preview: imgData,
                    board: this.editedGame.board,
                };
                this.gameService.saveGame(this.editedGame._id, gameData);
            }
        });
    }

    selectTool(tool: Tool): void {
        this.activeTool = tool;
    }

    buildGrid(size: number): void {
        const total = size * size;
        //this.cells = Array.from({ length: total }, () => CellType.Empty);
        this.objects = Array.from({ length: total }, () => null);
        this.sanctuaryCoordinates = [];
        this.updateMaxAmount();
    }

    // ngOnInit(): void {
    //     this.buildGrid(this.gridSize);
    // }

    setGrid(size: number): void {
        if (this.isBoardFilled()) {
            const confirmChange = confirm('Changing the grid size will erase your progress. Save first to not lose progress');
            if (!confirmChange) {
                return;
            }
        }
        this.gridSize = size;
        this.resetGrid();
        this.buildGrid(size);
    }

    selectMaterial(material: CellType): void {
        this.selectedMaterial = material;
    }

    selectObject(object: ItemType): void {
        this.selectedObject = object;
    }

    applyTile(rowIndex: number, index: number): void {
        if (this.activeTool !== 'placement') return;

        if (this.selectedMaterial === CellType.OpenDoor) {
            this.gameCells[rowIndex][index] = this.gameCells[rowIndex][index] === CellType.OpenDoor ? CellType.ClosedDoor : CellType.OpenDoor;
            return;
        }

        if (this.blockingCells.has(this.selectedMaterial) && this.objects[index]) return;

        this.gameCells[rowIndex][index] = this.selectedMaterial;
    }

    // eslint-disable-next-line complexity
    applyObject(rowIndex: number, index: number): void {
        if (this.activeTool !== 'objects' || !this.selectedObject) return;
        if (this.isFlagPlaced && this.selectedObject === ItemType.Flag) return;
        if (this.selectedObject === ItemType.LifeSanctuary && this.healSanctuaryAmount >= this.sanctuaryMaxAmount) return;
        if (this.selectedObject === ItemType.FightSanctuary && this.fightSanctuaryAmount >= this.sanctuaryMaxAmount) return;

        if (this.spawnpointAmount >= this.spawnpointMaxAmount && this.selectedObject === ItemType.StartingPosition) return;

        if (this.blockingCells.has(this.gameCells[rowIndex][index])) return;

        if (this.selectedObject === ItemType.FightSanctuary || this.selectedObject === ItemType.LifeSanctuary) {
            const size = this.gridSize;
            const coordinates = [index, index + 1, index + size, index + size + 1];
            const col = index % size;
            if (col === size - 1) return;
            if (coordinates.some((coords) => coords >= this.objects.length)) return;

            const overlaps = this.sanctuaryCoordinates.some((sanctuary) => sanctuary.some((cell) => coordinates.includes(cell)));

            if (overlaps) {
                alert('Overwriting another sanctuary, error.');
                return;
            }

            for (const coord of coordinates) {
                if (this.blockingCells.has(this.gameCells[1][coord])) return;
            }

            for (const coord of coordinates) {
                this.objects[coord] = this.selectedObject;
            }

            this.sanctuaryCoordinates.push(coordinates);
            if (this.selectedObject === ItemType.FightSanctuary) this.fightSanctuaryAmount++;
            if (this.selectedObject === ItemType.LifeSanctuary) this.healSanctuaryAmount++;

            return;
        }

        if (!this.objects[index]) {
            this.objects[index] = this.selectedObject;
            if (this.selectedObject === ItemType.Flag) {
                this.isFlagPlaced = true;
            }
            if (this.selectedObject === ItemType.StartingPosition) this.spawnpointAmount++;
        }
    }

    erase(rowIndex: number, index: number): void {
        if (this.objects[index]) {
            const sanctuary = this.sanctuaryCoordinates.find((s) => s.includes(index));

            if (sanctuary) {
                if (this.objects[index] === ItemType.LifeSanctuary) this.healSanctuaryAmount--;
                if (this.objects[index] === ItemType.FightSanctuary) this.fightSanctuaryAmount--;
                for (const coord of sanctuary) {
                    this.objects[coord] = null;
                }
                this.sanctuaryCoordinates = this.sanctuaryCoordinates.filter((s) => s !== sanctuary);
            } else if (this.objects[index] === ItemType.Flag) {
                this.isFlagPlaced = false;
                this.objects[index] = null;
            } else if (this.objects[index] === ItemType.StartingPosition) {
                this.spawnpointAmount--;
                this.objects[index] = null;
            } else {
                this.objects[index] = null;
            }
            return;
        }

        this.gameCells[rowIndex][index] = CellType.Empty;
    }

    onMouseDown(rowIndex: number, index: number): void {
        this.isDrawing = true;
        this.lastIndexes = [rowIndex, index];

        if (this.activeTool === 'erase') {
            this.erase(rowIndex, index);
        } else if (this.activeTool === 'objects') {
            this.applyObject(rowIndex, index);
        } else {
            if (this.activeTool === 'placement' && this.selectedMaterial === CellType.OpenDoor) {
                this.gameCells[rowIndex][index] = this.gameCells[rowIndex][index] === CellType.OpenDoor ? CellType.ClosedDoor : CellType.OpenDoor;
                return;
            }
            this.applyTile(rowIndex, index);
        }
    }

    onMouseMove(rowIndex: number, index: number): void {
        if (!this.isDrawing) return;
        if (this.lastIndexes[0] === rowIndex && this.lastIndexes[1] === index) return;

        this.lastIndexes = [rowIndex, index];
        if (this.activeTool === 'placement') {
            this.applyTile(rowIndex, index);
        }
        if (this.activeTool === 'erase') {
            this.erase(rowIndex, index);
        }
    }

    @HostListener('window:mouseup')
    stopDrawing(): void {
        this.isDrawing = false;
    }

    resetGrid(): void {
        this.buildGrid(this.gridSize);
        this.isFlagPlaced = false;
        this.spawnpointAmount = 0;
        this.fightSanctuaryAmount = 0;
        this.healSanctuaryAmount = 0;
    }

    isBoardFilled(): boolean {
        return this.gameCells.some((row) => {
            return row.some((cell) => cell !== CellType.Empty);
        });
    }

    getSanctuaryBgPosition(index: number): string | null {
        for (const sanctuary of this.sanctuaryCoordinates) {
            const topLeft = sanctuary[0];
            const size = this.gridSize;

            if (!sanctuary.includes(index)) continue;

            if (index === topLeft) return '0% 0%';
            if (index === topLeft + 1) return '100% 0%';
            if (index === topLeft + size) return '0% 100%';
            if (index === topLeft + size + 1) return '100% 100%';
        }
        return null;
    }

    get remainingHealSanctuaries(): number {
        return this.sanctuaryMaxAmount - this.healSanctuaryAmount;
    }

    get remainingFightSanctuaries(): number {
        return this.sanctuaryMaxAmount - this.fightSanctuaryAmount;
    }

    get remainingSpawnpoints(): number {
        return this.spawnpointMaxAmount - this.spawnpointAmount;
    }

    get remainingFlags(): number {
        return this.isFlagPlaced ? 0 : 1;
    }

    get currentMode(): string {
        return this.isCTF ? 'CTF' : 'Normal';
    }
}
