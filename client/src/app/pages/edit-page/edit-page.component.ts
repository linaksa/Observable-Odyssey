import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, inject, OnDestroy, OnInit, Signal, ViewChild } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LoadingOverlayComponent } from '@app/components/loading-overlay/loading-overlay.component';
import { CELL_TYPE_DESCRIPTION, CELL_TYPE_IMAGE_PATHS, OBJECT_IMAGES, OBJECT_TYPE_IMAGE_PATHS } from '@app/constants/backgrounds-mapping';
import { BoardEditorService, Tool, ToolOption } from '@app/services/edition.service';
import { GameEditFormService } from '@app/services/game-edit-form.service';
import { GameService } from '@app/services/game.service';
import { CellType } from '@common/board';
import { GameSize } from '@common/constants';
import { GameType, IExistingGame, Visibility } from '@common/game';
import { IItem, ItemType } from '@common/items';
import { Subject, takeUntil } from 'rxjs';

interface MouseInteractionState {
    isDrawing: boolean;
    isShiftPressed: boolean;
    lastIndexes: [number, number];
}

@Component({
    selector: 'app-edit-page',
    imports: [CommonModule, LoadingOverlayComponent, RouterLink, ReactiveFormsModule],
    templateUrl: './edit-page.component.html',
})
export class EditPageComponent implements OnInit, OnDestroy {
    @ViewChild('grid', { static: false }) grid?: ElementRef<HTMLElement>;

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly gameService = inject(GameService);
    readonly boardEditorService = inject(BoardEditorService);
    readonly gameEditFormService = inject(GameEditFormService);
    private readonly destroy$ = new Subject<void>();

    editedGame: IExistingGame | null = null;
    showButton = false;
    newGame = false;
    previousVersion!: IExistingGame;

    private readonly buttonDisplayTimeout = 0;

    private mouseState: MouseInteractionState = {
        isDrawing: false,
        isShiftPressed: false,
        lastIndexes: [0, 0],
    };

    readonly toolDescToolTip: Readonly<Record<ToolOption, string>> = {
        [ToolOption.Placement]: "Placement d'une tuile",
        [ToolOption.Objects]: "Placement d'un objet",
    };

    readonly itemTypesDescLabels: Readonly<Record<ItemType, string>> = {
        [ItemType.LifeSanctuary]: 'Soigne le joueur',
        [ItemType.FightSanctuary]: "Augmente les degats d'attaque",
        [ItemType.StartingPosition]: "Position d'apparition du joueur",
        [ItemType.Flag]: 'Objectif pour le mode CTF',
    };

    readonly isSubmittingFlag: Signal<boolean> = this.gameEditFormService.isSubmitting.asReadonly();

    ngOnInit(): void {
        this.initializeButtonTimeout();
        this.subscribeToRouteParams();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private initializeButtonTimeout(): void {
        setTimeout(() => {
            this.showButton = true;
        }, this.buttonDisplayTimeout);
    }

    private subscribeToRouteParams(): void {
        this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
            if (params.gameId === 'new') {
                this.handleNewGame();
            } else {
                this.handleExistingGame(params.gameId);
            }

            // TODO: Disable game mode for sprint 1
            this.gameEditFormService.form.get('gameMode')?.disable({ emitEvent: false });
        });
    }

    private handleNewGame(): void {
        this.newGame = true;

        if (this.gameService.gameUnderCreation) {
            this.editedGame = this.gameService.gameUnderCreation;
        } else {
            this.editedGame = this.createDefaultGame();
        }

        this.initializeEditor(this.editedGame);
    }

    private handleExistingGame(gameId: string): void {
        this.gameService
            .getGameById(gameId)
            .pipe(takeUntil(this.destroy$))
            .subscribe((game) => {
                this.editedGame = game;
                this.initializeEditor(this.editedGame);
            });
    }

    private createDefaultGame(): IExistingGame {
        const size = Math.sqrt(GameSize.Small);
        return {
            _id: '',
            gameTitle: '',
            gameMode: GameType.Classic,
            description: '',
            lastModifiedDate: new Date(),
            dateCreated: new Date(),
            visibility: Visibility.Hidden,
            preview: '',
            board: {
                items: [],
                cells: Array.from({ length: size }, () => Array(size).fill(CellType.Grass)),
            },
        };
    }

    private initializeEditor(game: IExistingGame): void {
        this.boardEditorService.buildGrid(game.board.cells.length);
        this.previousVersion = structuredClone(game);
        this.boardEditorService.initFromExistingBoard(structuredClone(this.previousVersion));
        this.gameEditFormService.init(game);
    }

    gameModeChange(event: Event): void {
        const selectElement = event.target as HTMLSelectElement;
        const selectedMode = selectElement.value as GameType;

        if (!this.canChangeGameMode(selectedMode, selectElement)) {
            return;
        }

        this.boardEditorService.changeGameMode(selectedMode);
    }

    private canChangeGameMode(selectedMode: GameType, selectElement: HTMLSelectElement): boolean {
        const hasFlag = this.boardEditorService.getObjectCount(ItemType.Flag) > 0;

        if (hasFlag && selectedMode !== GameType.Ctf) {
            const confirmed = confirm('Changing the mode to Normal while a flag is placed will remove it.');

            if (!confirmed) {
                this.boardEditorService.changeGameMode(this.boardEditorService.gameMode);
                selectElement.value = this.boardEditorService.gameMode;
                return false;
            }
        }

        return true;
    }

    selectTool(tool: Tool): void {
        this.boardEditorService.activeTool = tool;
    }

    selectMaterial(material: CellType): void {
        this.boardEditorService.selectedMaterial = material;
    }

    selectObject(object: ItemType): void {
        this.boardEditorService.selectedObject = object;
    }

    onMouseDown(row: number, col: number, event: MouseEvent): void {
        event.preventDefault();
        this.mouseState.isDrawing = true;
        this.mouseState.lastIndexes = [row, col];

        if (event.button === 2) {
            this.handleRightClick(row, col);
            return;
        }

        this.handleLeftClick(row, col);
    }

    private handleRightClick(row: number, col: number): void {
        if (this.mouseState.isShiftPressed) {
            this.boardEditorService.eraseObject(row, col);
        } else {
            this.boardEditorService.eraseTile(row, col);
        }
    }

    private handleLeftClick(row: number, col: number): void {
        if (this.boardEditorService.activeTool === ToolOption.Objects) {
            this.boardEditorService.applyObject(row, col);
            return;
        }

        if (this.isDoorToggleMode()) {
            this.toggleDoor(row, col);
            return;
        }

        this.boardEditorService.applyTile(row, col);
    }

    private isDoorToggleMode(): boolean {
        return this.boardEditorService.activeTool === ToolOption.Placement && this.boardEditorService.selectedMaterial === CellType.OpenDoor;
    }

    private toggleDoor(row: number, col: number): void {
        const currentCell = this.boardEditorService.gameCells[row][col];
        this.boardEditorService.gameCells[row][col] = currentCell === CellType.OpenDoor ? CellType.ClosedDoor : CellType.OpenDoor;
    }

    onMouseEnter(row: number, col: number, event: MouseEvent): void {
        if (!this.mouseState.isDrawing) return;
        if (this.isSameCell(row, col)) return;

        this.mouseState.lastIndexes = [row, col];

        if (event.buttons === 2) {
            this.handleRightClick(row, col);
            return;
        }

        if (this.boardEditorService.activeTool === ToolOption.Placement) {
            this.boardEditorService.applyTile(row, col);
        }
    }

    private isSameCell(row: number, col: number): boolean {
        return this.mouseState.lastIndexes[0] === row && this.mouseState.lastIndexes[1] === col;
    }

    @HostListener('window:mouseup')
    stopDrawing(): void {
        this.mouseState.isDrawing = false;
    }

    @HostListener('window:keydown.shift')
    onShiftDown(): void {
        this.mouseState.isShiftPressed = true;
    }

    @HostListener('window:keyup.shift')
    onShiftUp(): void {
        this.mouseState.isShiftPressed = false;
    }

    get availableItemsTypes(): ItemType[] {
        const baseItemTypes = [ItemType.LifeSanctuary, ItemType.FightSanctuary, ItemType.StartingPosition];

        if (this.boardEditorService.gameMode === GameType.Ctf) {
            return [...baseItemTypes, ItemType.Flag];
        }

        return baseItemTypes;
    }

    setGridSize(size: number): void {
        this.boardEditorService.setGrid(size);

        setTimeout(() => {
            const gridElement = this.getGridElement();
            if (gridElement) {
                gridElement.blur();
            }
        }, 0);
    }

    cellImagePath(cellType: CellType): string {
        return CELL_TYPE_IMAGE_PATHS[cellType];
    }

    cellDescription(cellType: CellType): string {
        return CELL_TYPE_DESCRIPTION[cellType];
    }

    objectImagePath(itemType: ItemType): string {
        return OBJECT_TYPE_IMAGE_PATHS[itemType];
    }

    backgroundImageForObject(item: IItem | null): string {
        if (!item) return '';
        return OBJECT_IMAGES[item.itemType];
    }

    objectExtraStyles(item: IItem, row: number, col: number): Record<string, string> {
        if (!item) return {};

        if (this.isSanctuaryItem(item)) {
            return {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'background-position': this.getSanctuaryBgPosition(row, col, item),
            };
        }

        return {};
    }

    private isSanctuaryItem(item: IItem): boolean {
        return item.itemType === ItemType.LifeSanctuary || item.itemType === ItemType.FightSanctuary;
    }

    private getSanctuaryBgPosition(row: number, col: number, item: IItem): string {
        const relativeRow = row - item.x;
        const relativeCol = col - item.y;

        if (relativeRow === 0 && relativeCol === 0) {
            return '0% 0%';
        } else if (relativeRow === 0 && relativeCol === 1) {
            return '100% 0%';
        } else if (relativeRow === 1 && relativeCol === 0) {
            return '0% 100%';
        } else if (relativeRow === 1 && relativeCol === 1) {
            return '100% 100%';
        }

        return '';
    }

    async submitGameForm(): Promise<void> {
        if (!this.editedGame) return;

        try {
            await this.gameEditFormService.submitForm(
                this.editedGame._id,
                this.boardEditorService.gameCells,
                this.boardEditorService.objects,
                this.getGridElement(),
            );
            await this.router.navigate(['/admin']);
        } catch {
            // do nothing
        }
    }

    revertToOriginal(): void {
        this.boardEditorService.revertGrid(this.previousVersion);
        this.gameEditFormService.init(this.previousVersion);
    }

    private getGridElement(): HTMLElement | null {
        return this.grid?.nativeElement ?? null;
    }
}
