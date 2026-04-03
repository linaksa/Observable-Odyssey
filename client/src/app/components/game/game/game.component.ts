import { Component, effect, inject, OnInit } from '@angular/core';
import { GameGridCellEvent, GameGridComponent } from '@app/components/common/game-grid/game-grid.component';
import { SanctuaryPopupComponent } from '@app/components/game/sanctuary-popup/sanctuary-popup.component';
import { TileInfoPopupComponent } from '@app/components/game/tile-info-popup/tile-info-popup.component';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameInteractionService } from '@app/services/gameplay/game-interaction.service';
import { GamePopupStateService } from '@app/services/gameplay/game-popup-state.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { BoardSharedService } from '@app/services/shared/board-shared.service';
import { buildGraph } from '@app/utils/pathfinding';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { SanctuaryChoice, SanctuaryPopupData, TileInfoPopupData } from '@common/info';
import { IItem } from '@common/items';

const GAME_HOST_BINDINGS = {
    ['(window:keydown)']: 'handleKeyboard($event)',
    ['(document:click)']: 'onDocumentClick($event)',
} as const;

@Component({
    selector: 'app-game',
    imports: [GameGridComponent, SanctuaryPopupComponent, TileInfoPopupComponent],
    templateUrl: './game.component.html',
    host: GAME_HOST_BINDINGS,
})
export class GameComponent implements OnInit {
    protected readonly activeGameService: ActiveGameService = inject(ActiveGameService);
    protected readonly boardSharedService: BoardSharedService = inject(BoardSharedService);
    private readonly localPlayerService: LocalPlayerService = inject(LocalPlayerService);
    private readonly interactionService: GameInteractionService = inject(GameInteractionService);
    private readonly popupStateService: GamePopupStateService = inject(GamePopupStateService);

    graph: [number, number][][] = [];

    totalRows = 0;
    totalColumns = 0;

    protected get isLocalPlayerTurn(): boolean {
        const localPlayer = this.localPlayerService.getLocalPlayer();
        if (!localPlayer) return false;
        const currentPlayer = this.activeGameService.getCurrentPlayer();
        return currentPlayer?.name === localPlayer.name;
    }

    protected get gameCells(): CellType[][] {
        return this.activeGameService.activeGame?.game.board.cells ?? [];
    }

    protected get gamePlayers(): readonly ICharacter[] | null {
        const activeGame = this.activeGameService.activeGame;

        if (!activeGame) {
            return null;
        }

        return [...activeGame.players];
    }

    protected get reachableTiles(): ReadonlySet<number> | null {
        return this.isLocalPlayerTurn ? this.activeGameService.reachableTiles : null;
    }

    protected get tileInfoPopupData(): TileInfoPopupData {
        return this.popupStateService.tileInfoPopupData;
    }

    protected get sanctuaryPopupData(): SanctuaryPopupData {
        return this.popupStateService.sanctuaryPopupData;
    }

    readonly getObjectAt = (rowIndex: number, colIndex: number): IItem | null => {
        const activeGame = this.activeGameService.activeGame;

        if (!activeGame) {
            return null;
        }

        return this.boardSharedService.getObjectAt(rowIndex, colIndex, activeGame.game.board.items);
    };

    constructor() {
        effect(() => {
            this.activeGameService.currentPlayer();
            this.activeGameService.hasChangedLocation();
            this.activeGameService.hasAbandonned();
            this.activeGameService.gameHasEnded();

            if (this.popupStateService.isSanctuaryPopupVisible && (!this.isLocalPlayerTurn || this.activeGameService.gameHasEnded())) {
                this.popupStateService.closeSanctuaryPopup();
            }

            this.refreshGraphFromBoard();
            this.activeGameService.updateMovementRange(this.totalColumns, this.graph);
        });
    }

    ngOnInit(): void {
        this.popupStateService.closeAllPopups();
        const board = this.activeGameService.activeGame.game.board.cells;
        this.totalRows = board.length;
        this.totalColumns = board[0].length;
        this.refreshGraphFromBoard();
        this.activeGameService.updateMovementRange(this.totalColumns, this.graph);
    }

    handleKeyboard(event: KeyboardEvent): void {
        this.interactionService.handleKeyboard(event, this.totalColumns);
    }

    onGridCellContextMenu(event: GameGridCellEvent): void {
        this.onCellRightClick(event.event, event.rowIndex, event.colIndex, event.cellType, event.item);
    }

    onGridCellClick(event: GameGridCellEvent): void {
        this.interactionService.handleGridCellClick(event.rowIndex, event.colIndex, event.cellType, event.item);
    }

    onPlayerClicked(playerName: string): void {
        this.interactionService.handlePlayerClick(playerName);
    }

    onDocumentClick(event?: MouseEvent): void {
        this.interactionService.handleDocumentClick(event);
    }

    onSanctuaryChoice(choice: SanctuaryChoice): void {
        this.interactionService.handleSanctuaryChoice(choice);
    }

    onCellRightClick(event: MouseEvent, rowIndex: number, colIndex: number, cellType: CellType, item: IItem | null = null): void {
        this.interactionService.handleCellRightClick(event, rowIndex, colIndex, cellType, item);
    }

    private refreshGraphFromBoard(): void {
        const activeGame = this.activeGameService.activeGame;
        if (!activeGame) {
            this.graph = [];
            return;
        }

        const board = activeGame.game.board.cells;

        if (!board.length || !board[0]?.length) {
            this.graph = [];
            return;
        }

        this.graph = buildGraph(board, this.activeGameService.getCurrentPlayer()?.actionsLeft, activeGame.game.board.items, activeGame.players);
    }
}
