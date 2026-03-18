import { CommonModule } from '@angular/common';
import { Component, effect, HostListener, inject, OnInit } from '@angular/core';
import { EditionCellComponent } from '@app/components/edition/edition-cell/edition-cell.component';
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

@Component({
    selector: 'app-game',
    imports: [CommonModule, EditionCellComponent, TileInfoPopupComponent],
    styleUrl: '../../../styles/game-cell.scss',
    templateUrl: './game.component.html',
})
export class GameComponent implements OnInit {
    protected readonly activeGameService: ActiveGameService = inject(ActiveGameService);
    protected readonly boardSharedService: BoardSharedService = inject(BoardSharedService);
    private readonly tileInfoService: TileInfoService = inject(TileInfoService);
    private readonly localPlayerService: LocalPlayerService = inject(LocalPlayerService);

    protected get isLocalPlayerTurn(): boolean {
        const localPlayer = this.localPlayerService.getLocalPlayer();
        if (!localPlayer) return false;
        const currentPlayer = this.activeGameService.getCurrentPlayer();
        return currentPlayer?.name === localPlayer.name;
    }

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

    constructor() {
        effect(() => {
            this.activeGameService.currentPlayer();
            this.activeGameService.hasChangedLocation();
            this.activeGameService.hasAbandonned();
            this.activeGameService.gameHasEnded();
            this.activeGameService.updateMovementRange(this.totalColumns, this.graph);
        });
    }

    ngOnInit() {
        const board = this.activeGameService.activeGame.game.board.cells;
        this.totalRows = board.length;
        this.totalColumns = board[0].length;
        this.graph = buildGraph(board);

        this.activeGameService.updateMovementRange(this.totalColumns, this.graph);
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyboard(event: KeyboardEvent) {
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

    onPlayerClicked(playerName: string) {
        if (!this.activeGameService.attackMode() || !this.isLocalPlayerTurn) {
            return;
        }
        this.activeGameService.attackPlayer(playerName);

        this.activeGameService.attackMode.set(false);
    }

    @HostListener('document:click')
    onDocumentClick(): void {
        this.closeTileInfo();
    }

    onCellRightClick(event: MouseEvent, rowIndex: number, colIndex: number, cellType: CellType): void {
        event.preventDefault();
        event.stopPropagation();

        if (this.activeGameService.isDebugMode() && this.isLocalPlayerTurn) {
            if (!this.isTeleportableCell(rowIndex, colIndex, cellType)) return;
            this.closeTileInfo();
            this.activeGameService.debugTeleport(rowIndex, colIndex);
            return;
        }

        const itemAtPosition = this.boardSharedService.getObjectAt(rowIndex, colIndex, this.activeGameService.activeGame.game.board.items);
        const playerAtPosition = this.activeGameService.getPlayersAtPosition(rowIndex, colIndex)[0] ?? null;
        this.openTileInfo(cellType, itemAtPosition, playerAtPosition);
    }

    private isTeleportableCell(row: number, col: number, cellType: CellType): boolean {
        if (cellType === CellType.Wall || cellType === CellType.ClosedDoor) return false;
        if (this.boardSharedService.getObjectAt(row, col, this.activeGameService.activeGame.game.board.items)) return false;
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
