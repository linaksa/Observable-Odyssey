import { Component, effect, inject, OnInit } from '@angular/core';
import { GameGridCellEvent, GameGridComponent } from '@app/components/common/game-grid/game-grid.component';
import { TileInfoPopupComponent } from '@app/components/game/tile-info-popup/tile-info-popup.component';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { BoardSharedService } from '@app/services/shared/board-shared.service';
import { TileInfoService } from '@app/services/ui/tile-info.service';
import { isTypingInChatMessageInput } from '@app/utils/keyboard-shortcuts.utils';
import { buildGraph } from '@app/utils/pathfinding';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { TileInfoPopupData } from '@common/info';
import { IItem } from '@common/items';

const GAME_HOST_BINDINGS = {
    ['(window:keydown)']: 'handleKeyboard($event)',
    ['(document:click)']: 'onDocumentClick()',
} as const;

@Component({
    selector: 'app-game',
    imports: [GameGridComponent, TileInfoPopupComponent],
    styleUrl: '../../../styles/game-cell.scss',
    templateUrl: './game.component.html',
    host: GAME_HOST_BINDINGS,
})
export class GameComponent implements OnInit {
    protected readonly activeGameService: ActiveGameService = inject(ActiveGameService);
    protected readonly boardSharedService: BoardSharedService = inject(BoardSharedService);
    private readonly tileInfoService: TileInfoService = inject(TileInfoService);
    private readonly localPlayerService: LocalPlayerService = inject(LocalPlayerService);

    graph: [number, number][][] = [];

    totalRows = 0;
    totalColumns = 0;

    isTileInfoVisible = false;
    tileInfoTitle = '';
    tileInfoDescription = '';
    tileInfoMovementCost = '';
    tileInfoItemTitle: string | null = null;
    tileInfoItemDescription: string | null = null;
    tileInfoPlayerName: string | null = null;
    tileInfoPlayerAvatarUrl: string | null = null;

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
        return {
            visible: this.isTileInfoVisible,
            title: this.tileInfoTitle,
            description: this.tileInfoDescription,
            movementCost: this.tileInfoMovementCost,
            itemTitle: this.tileInfoItemTitle,
            itemDescription: this.tileInfoItemDescription,
            playerName: this.tileInfoPlayerName,
            playerAvatarUrl: this.tileInfoPlayerAvatarUrl,
        };
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
            this.activeGameService.updateMovementRange(this.totalColumns, this.graph);
        });
    }

    ngOnInit(): void {
        const board = this.activeGameService.activeGame.game.board.cells;
        this.totalRows = board.length;
        this.totalColumns = board[0].length;
        this.graph = buildGraph(board);

        this.activeGameService.updateMovementRange(this.totalColumns, this.graph);
    }

    handleKeyboard(event: KeyboardEvent): void {
        if (isTypingInChatMessageInput(event)) return;
        if (!this.isLocalPlayerTurn) return;

        switch (event.key.toLowerCase()) {
            case 'w':
                this.activeGameService.tryMove(-1, 0, this.totalColumns);
                break;

            case 's':
                this.activeGameService.tryMove(1, 0, this.totalColumns);
                break;

            case 'a':
                this.activeGameService.tryMove(0, -1, this.totalColumns);
                break;

            case 'd':
                this.activeGameService.tryMove(0, 1, this.totalColumns);
                break;
        }
    }

    onGridCellContextMenu(event: GameGridCellEvent): void {
        this.onCellRightClick(event.event, event.rowIndex, event.colIndex, event.cellType, event.item);
    }

    onPlayerClicked(playerName: string): void {
        if (!this.activeGameService.attackMode() || !this.isLocalPlayerTurn) {
            return;
        }

        this.activeGameService.attackPlayer(playerName);
        this.activeGameService.attackMode.set(false);
    }

    onDocumentClick(): void {
        this.closeTileInfo();
    }

    onCellRightClick(event: MouseEvent, rowIndex: number, colIndex: number, cellType: CellType, item: IItem | null = null): void {
        event.preventDefault();
        event.stopPropagation();

        if (this.activeGameService.isDebugMode() && this.isLocalPlayerTurn) {
            if (!this.isTeleportableCell(rowIndex, colIndex, cellType, item)) return;
            this.closeTileInfo();
            this.activeGameService.debugTeleport(rowIndex, colIndex);
            return;
        }

        const playerAtPosition = this.activeGameService.getPlayersAtPosition(rowIndex, colIndex)[0] ?? null;
        const activeGame = this.activeGameService.activeGame;
        const itemAtPosition = item ?? (activeGame ? this.boardSharedService.getObjectAt(rowIndex, colIndex, activeGame.game.board.items) : null);
        this.openTileInfo(cellType, itemAtPosition, playerAtPosition);
    }

    private isTeleportableCell(row: number, col: number, cellType: CellType, item: IItem | null = null): boolean {
        if (cellType === CellType.Wall || cellType === CellType.ClosedDoor) return false;
        const activeGame = this.activeGameService.activeGame;
        if (item ?? (activeGame ? this.boardSharedService.getObjectAt(row, col, activeGame.game.board.items) : null)) return false;
        if (this.activeGameService.getPlayersAtPosition(row, col).length > 0) return false;
        return true;
    }

    private openTileInfo(cellType: CellType, item: IItem | null, player: ICharacter | null): void {
        const tileInfo = this.tileInfoService.getTileInfo(cellType);
        this.tileInfoTitle = tileInfo.title;
        this.tileInfoDescription = tileInfo.description;
        this.tileInfoMovementCost = tileInfo.movementCost;
        const itemInfo = this.tileInfoService.getItemInfo(item);
        this.tileInfoItemTitle = itemInfo?.title ?? null;
        this.tileInfoItemDescription = itemInfo?.description ?? null;
        const playerInfo = this.tileInfoService.getPlayerInfo(player);
        this.tileInfoPlayerName = playerInfo?.name ?? null;
        this.tileInfoPlayerAvatarUrl = playerInfo?.avatarUrl ?? null;
        this.isTileInfoVisible = true;
    }

    private closeTileInfo(): void {
        this.isTileInfoVisible = false;
        this.tileInfoItemTitle = null;
        this.tileInfoItemDescription = null;
        this.tileInfoPlayerName = null;
        this.tileInfoPlayerAvatarUrl = null;
    }
}
