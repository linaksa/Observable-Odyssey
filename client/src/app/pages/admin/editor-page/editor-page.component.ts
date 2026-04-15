import { ChangeDetectionStrategy, Component, HostListener, inject, OnDestroy, OnInit, signal, ViewChild, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LoadingOverlayComponent } from '@app/components/common/loading-overlay/loading-overlay.component';
import { NavButtonsComponent } from '@app/components/common/nav-buttons/nav-buttons.component';
import { PageTitleComponent } from '@app/components/common/page-title/page-title.component';
import { EditorFormPanelComponent } from '@app/components/editor/form-panel/editor-form-panel.component';
import { EditorGridPanelComponent } from '@app/components/editor/grid-panel/editor-grid-panel.component';
import { EditorToolPanelComponent } from '@app/components/editor/tool-panel/editor-tool-panel.component';
import { EDITION_PAGE_BUTTON_TIMEOUT_MS, TOOL_DESC_TOOL_TIP, TOOL_ICON } from '@app/constants/editor-page';
import { GridSize, ToolOption } from '@app/constants/grid-editor';
import { GameService } from '@app/services/admin/game.service';
import { BoardEditorService } from '@app/services/editor/editor.service';
import { GameEditFormService } from '@app/services/forms/game-edit-form.service';
import { CellType } from '@common/board';
import { GameType, IExistingGame, Visibility } from '@common/game';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
    selector: 'app-editor-page',
    imports: [
        EditorFormPanelComponent,
        EditorGridPanelComponent,
        EditorToolPanelComponent,
        LoadingOverlayComponent,
        NavButtonsComponent,
        PageTitleComponent,
        RouterLink,
    ],
    templateUrl: './editor-page.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorPageComponent implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly gameService = inject(GameService);

    protected readonly boardEditorService = inject(BoardEditorService);
    protected readonly gameEditFormService = inject(GameEditFormService);

    protected readonly showButton: WritableSignal<boolean> = signal(false);
    protected readonly isLoading: WritableSignal<boolean> = signal(false);
    protected readonly isSubmittingFlag = this.gameEditFormService.isSubmitting.asReadonly();
    protected readonly toolDescToolTip = TOOL_DESC_TOOL_TIP;
    protected readonly toolIcons = TOOL_ICON;

    editedGame: IExistingGame | null = null;
    previousVersion!: IExistingGame;

    private readonly timeout: number = EDITION_PAGE_BUTTON_TIMEOUT_MS;
    private routeSubscription?: Subscription;
    private gameServiceSubscription?: Subscription;
    private buttonTimeoutId?: ReturnType<typeof setTimeout>;

    private mouseState = {
        isDrawing: false,
        isShiftPressed: false,
        lastIndexes: [0, 0] as [number, number],
    };

    @ViewChild(EditorGridPanelComponent)
    private gridPanel?: EditorGridPanelComponent;

    ngOnInit(): void {
        this.initializeButtonTimeout();
        this.isLoading.set(true);

        this.routeSubscription = this.route.params.subscribe((params) => {
            const gameId = params.gameId as string;

            if (gameId === 'creation') {
                this.handleCreation();
                return;
            }

            this.handleExistingGame(gameId);
        });
    }

    ngOnDestroy(): void {
        this.routeSubscription?.unsubscribe();
        this.gameServiceSubscription?.unsubscribe();

        if (this.buttonTimeoutId) {
            clearTimeout(this.buttonTimeoutId);
        }
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

    onMouseEnter(row: number, col: number, event: MouseEvent): void {
        if (!this.mouseState.isDrawing || this.isSameCell(row, col)) {
            return;
        }

        this.mouseState.lastIndexes = [row, col];

        if (event.buttons === 2) {
            this.handleRightClick(row, col);
            return;
        }

        if (this.boardEditorService.activeTool === ToolOption.Placement) {
            this.boardEditorService.applyTile(row, col);
        }
    }

    setGridSize(size: number): void {
        this.boardEditorService.buildGrid(size);

        setTimeout(() => {
            this.gridPanel?.getGridElement()?.blur();
        }, 0);
    }

    submitGameForm(): void {
        if (!this.editedGame) {
            this.gameEditFormService.formErrors.set(['La sauvegarde du jeu est impossible tant que la page n’est pas complètement chargée.']);
            return;
        }

        this.gameEditFormService
            .submitForm(this.editedGame._id, this.boardEditorService.gameMode, this.boardEditorService.gameCells, this.boardEditorService.objects)
            .then(() => {
                return this.router.navigate(['/admin']);
            })
            .catch(() => {
                if (this.gameEditFormService.formErrors().length === 0 && this.gameEditFormService.validationErrorCodes().length === 0) {
                    this.gameEditFormService.formErrors.set(['La sauvegarde du jeu a échoué. Veuillez corriger les erreurs et réessayer.']);
                }
            });
    }

    revertToOriginal(): void {
        this.boardEditorService.revertGrid(this.previousVersion);
        this.boardEditorService.activeTool = ToolOption.Placement;
        this.boardEditorService.selectedMaterial = CellType.Empty;
        this.boardEditorService.selectedObject = null;
        this.gameEditFormService.init(this.previousVersion);
        this.gameEditFormService.formErrors.set([]);
        this.gameEditFormService.validationErrorCodes.set([]);
    }

    private handleCreation(): void {
        this.gameServiceSubscription?.unsubscribe();
        this.gameServiceSubscription = undefined;

        const game = this.gameService.gameUnderCreation ?? this.createDefaultGame();
        this.editedGame = game;
        this.initializeEditor(game);
        this.isLoading.set(false);
    }

    private handleExistingGame(gameId: string): void {
        this.editedGame = null;

        this.gameServiceSubscription?.unsubscribe();
        this.gameServiceSubscription = this.gameService
            .getGameById(gameId)
            .pipe(
                finalize(() => {
                    this.isLoading.set(false);
                    this.gameServiceSubscription = undefined;
                }),
            )
            .subscribe({
                next: (game) => {
                    if (!game) {
                        return;
                    }

                    this.editedGame = game;
                    this.initializeEditor(game);
                },
            });
    }

    private handleRightClick(row: number, col: number): void {
        if (this.mouseState.isShiftPressed) {
            this.boardEditorService.eraseObject(row, col);
            return;
        }

        this.boardEditorService.eraseTile(row, col);
    }

    private handleLeftClick(row: number, col: number): void {
        if (this.boardEditorService.activeTool === ToolOption.Objects) {
            this.boardEditorService.applyObject(row, col);
            return;
        }

        this.boardEditorService.applyTile(row, col);
    }

    private isSameCell(row: number, col: number): boolean {
        return this.mouseState.lastIndexes[0] === row && this.mouseState.lastIndexes[1] === col;
    }

    private initializeButtonTimeout(): void {
        this.buttonTimeoutId = setTimeout(() => {
            this.showButton.set(true);
        }, this.timeout);
    }

    private initializeEditor(game: IExistingGame): void {
        this.previousVersion = structuredClone(game);
        this.boardEditorService.buildGrid(game.board.cells.length);
        this.boardEditorService.initFromExistingBoard(structuredClone(this.previousVersion));
        this.boardEditorService.activeTool = ToolOption.Placement;
        this.boardEditorService.selectedMaterial = CellType.Empty;
        this.boardEditorService.selectedObject = null;
        this.gameEditFormService.init(game);
        this.gameEditFormService.formErrors.set([]);
        this.gameEditFormService.validationErrorCodes.set([]);
    }

    private createDefaultGame(): IExistingGame {
        return {
            _id: '',
            gameTitle: '',
            gameMode: GameType.Classic,
            description: '',
            lastModifiedDate: new Date(),
            dateCreated: new Date(),
            visibility: Visibility.Hidden,
            board: {
                items: [],
                cells: Array.from({ length: GridSize.SMALL }, () => Array(GridSize.SMALL).fill(CellType.Empty)),
            },
        };
    }
}
