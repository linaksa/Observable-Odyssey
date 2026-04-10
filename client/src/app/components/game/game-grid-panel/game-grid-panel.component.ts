import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { GameGridCellEvent, GameGridComponent } from '@app/components/common/game-grid/game-grid.component';
import { GameCombatPopupComponent } from '@app/components/game/game-combat-popup/game-combat-popup.component';
import { GameCombatOutcomeComponent } from '@app/components/game/game-combat-outcome/game-combat-outcome.component';
import { GameSanctuaryPopupComponent } from '@app/components/game/game-sanctuary-popup/game-sanctuary-popup.component';
import { GameTileInspectionPopupComponent } from '@app/components/game/game-tile-inspection-popup/game-tile-inspection-popup.component';
import { GAME_GRID_PANEL_HOST_BINDINGS } from '@app/constants/component-host-bindings';
import {
    GAME_GRID_PANEL_TOOLTIP_FALLBACK_WIDTH_PX,
    TOOLTIP_FALLBACK_HEIGHT_PX,
    TOOLTIP_HORIZONTAL_OFFSET_PX,
    TOOLTIP_VERTICAL_OFFSET_PX,
} from '@app/constants/tooltip';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameInteractionService } from '@app/services/gameplay/game-interaction.service';
import { GamePopupStateService } from '@app/services/gameplay/game-popup-state.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { BoardSharedService } from '@app/services/shared/board-shared.service';
import { buildGraph } from '@app/utils/pathfinding';
import { computeTooltipPosition, TooltipPosition } from '@app/utils/tooltip-position.utils';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { SanctuaryChoice, SanctuaryPopupData, TileInfoPopupData } from '@common/info';
import { IItem } from '@common/items';

@Component({
    selector: 'app-game-grid-panel',
    imports: [GameGridComponent, GameTileInspectionPopupComponent, GameSanctuaryPopupComponent, GameCombatPopupComponent, GameCombatOutcomeComponent],
    templateUrl: './game-grid-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: GAME_GRID_PANEL_HOST_BINDINGS,
})
export class GameGridPanelComponent {
    private readonly activeGameService = inject(ActiveGameService);
    private readonly boardSharedService = inject(BoardSharedService);
    private readonly localPlayerService = inject(LocalPlayerService);
    private readonly interactionService = inject(GameInteractionService);
    private readonly popupStateService = inject(GamePopupStateService);

    private graph: [number, number][][] = [];
    private totalColumns = 0;

    protected readonly titleTooltip = signal<string | null>(null);
    protected readonly titleTooltipPosition = signal<TooltipPosition>({ x: 0, y: 0 });
    protected readonly gameTitle = computed<string>(() => {
        this.activeGameService.hasChangedLocation();
        this.activeGameService.hasAbandonned();
        this.activeGameService.gameHasEnded();
        return this.activeGameService.activeGame?.game.gameTitle ?? 'Partie';
    });
    protected readonly gameDescription = computed<string>(() => {
        this.activeGameService.hasChangedLocation();
        this.activeGameService.hasAbandonned();
        this.activeGameService.gameHasEnded();
        return this.activeGameService.activeGame?.game.description ?? '';
    });
    protected readonly gameCells = computed<CellType[][]>(() => {
        this.activeGameService.hasChangedLocation();
        this.activeGameService.hasAbandonned();
        this.activeGameService.gameHasEnded();
        return this.activeGameService.activeGame?.game.board.cells ?? [];
    });
    protected readonly gamePlayers = computed<readonly ICharacter[]>(() => {
        this.activeGameService.hasChangedLocation();
        this.activeGameService.hasAbandonned();
        this.activeGameService.gameHasEnded();
        return [...(this.activeGameService.activeGame?.players ?? [])];
    });
    protected readonly titleLabel = computed<string>(() => `${this.gameTitle()} (${this.gameCells().length}×${this.gameCells().length})`);
    protected get reachableTiles(): ReadonlySet<number> | null {
        return this.isLocalPlayerTurn() ? this.activeGameService.reachableTiles : null;
    }

    @ViewChild('panelContainer', { read: ElementRef })
    private panelContainerRef?: ElementRef<HTMLDivElement>;

    @ViewChild('titleTooltipElement', { read: ElementRef })
    private titleTooltipRef?: ElementRef<HTMLDivElement>;

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

            if (this.popupStateService.isSanctuaryPopupVisible && (!this.isLocalPlayerTurn() || this.activeGameService.gameHasEnded())) {
                this.popupStateService.closeSanctuaryPopup();
            }

            this.refreshGraphFromBoard();
            this.activeGameService.updateMovementRange(this.totalColumns, this.graph);
        });
    }

    protected get tileInfoPopupData(): TileInfoPopupData {
        return this.popupStateService.tileInfoPopupData;
    }

    protected get sanctuaryPopupData(): SanctuaryPopupData {
        return this.popupStateService.sanctuaryPopupData;
    }

    protected get titleTooltipVisible(): boolean {
        return Boolean(this.titleTooltip());
    }

    protected showTitleTooltip(event: MouseEvent): void {
        const description = this.gameDescription();

        if (!description) {
            return;
        }

        this.titleTooltip.set(description);
        this.updateTitleTooltipPosition(event);
    }

    protected updateTitleTooltip(event: MouseEvent): void {
        if (!this.titleTooltipVisible) {
            return;
        }

        this.updateTitleTooltipPosition(event);
    }

    protected hideTitleTooltip(): void {
        this.titleTooltip.set(null);
    }

    protected onGridCellContextMenu(event: GameGridCellEvent): void {
        this.interactionService.handleCellRightClick(event.event, event.rowIndex, event.colIndex, event.cellType, event.item);
    }

    protected onGridCellClick(event: GameGridCellEvent): void {
        this.interactionService.handleGridCellClick(event.rowIndex, event.colIndex, event.cellType, event.item);
    }

    protected onPlayerClicked(player: ICharacter): void {
        this.interactionService.handlePlayerClick(player.name);
    }

    protected onSanctuaryChoice(choice: SanctuaryChoice): void {
        this.interactionService.handleSanctuaryChoice(choice);
    }

    protected onSanctuaryCancel(): void {
        this.interactionService.handleDocumentClick();
    }

    protected handleKeyboard(event: KeyboardEvent): void {
        this.interactionService.handleKeyboard(event, this.totalColumns);
    }

    protected handleDocumentClick(event?: MouseEvent): void {
        this.interactionService.handleDocumentClick(event);
    }

    private isLocalPlayerTurn(): boolean {
        const localPlayer = this.localPlayerService.getLocalPlayer();
        const currentPlayer = this.activeGameService.getCurrentPlayer();
        return Boolean(localPlayer && currentPlayer && localPlayer.name === currentPlayer.name);
    }

    private refreshGraphFromBoard(): void {
        const board = this.gameCells();

        if (!board.length || !board[0]?.length) {
            this.totalColumns = 0;
            this.graph = [];
            return;
        }

        this.totalColumns = board[0].length;
        this.graph = buildGraph(
            board,
            this.activeGameService.getCurrentPlayer()?.actionsLeft,
            this.activeGameService.activeGame.game.board.items,
            this.activeGameService.activeGame.players,
        );
    }

    private updateTitleTooltipPosition(event: MouseEvent): void {
        const containerRect = this.panelContainerRef?.nativeElement.getBoundingClientRect();
        const tooltipWidth = this.titleTooltipRef?.nativeElement.offsetWidth ?? GAME_GRID_PANEL_TOOLTIP_FALLBACK_WIDTH_PX;
        const tooltipHeight = this.titleTooltipRef?.nativeElement.offsetHeight ?? TOOLTIP_FALLBACK_HEIGHT_PX;

        this.titleTooltipPosition.set(
            computeTooltipPosition({
                event,
                containerRect,
                tooltipWidth,
                tooltipHeight,
                horizontalOffsetPx: TOOLTIP_HORIZONTAL_OFFSET_PX,
                verticalOffsetPx: TOOLTIP_VERTICAL_OFFSET_PX,
                fallbackPosition: {
                    x: event.clientX + TOOLTIP_HORIZONTAL_OFFSET_PX,
                    y: event.clientY + TOOLTIP_VERTICAL_OFFSET_PX,
                },
            }),
        );
    }
}
