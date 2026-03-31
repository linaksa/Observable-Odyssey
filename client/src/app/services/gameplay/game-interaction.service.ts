import { inject, Injectable } from '@angular/core';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { BoardSharedService } from '@app/services/shared/board-shared.service';
import { GamePopupStateService } from '@app/services/gameplay/game-popup-state.service';
import { isTypingInChatMessageInput } from '@app/utils/keyboard-shortcuts.utils';
import { isPositionAdjacentToSanctuary, isSanctuaryItem } from '@app/utils/sanctuary';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { SanctuaryChoice } from '@common/info';
import { IItem, ItemType } from '@common/items';

@Injectable({
    providedIn: 'root',
})
export class GameInteractionService {
    private readonly activeGameService = inject(ActiveGameService);
    private readonly localPlayerService = inject(LocalPlayerService);
    private readonly boardSharedService = inject(BoardSharedService);
    private readonly popupStateService = inject(GamePopupStateService);

    handleKeyboard(event: KeyboardEvent, totalColumns: number): void {
        if (isTypingInChatMessageInput(event)) return;
        if (this.popupStateService.isSanctuaryPopupVisible) return;
        if (!this.isLocalPlayerTurn()) return;

        switch (event.key.toLowerCase()) {
            case 'w':
                this.popupStateService.closeSanctuaryPopup();
                this.activeGameService.tryMove(-1, 0, totalColumns);
                break;

            case 's':
                this.popupStateService.closeSanctuaryPopup();
                this.activeGameService.tryMove(1, 0, totalColumns);
                break;

            case 'a':
                this.popupStateService.closeSanctuaryPopup();
                this.activeGameService.tryMove(0, -1, totalColumns);
                break;

            case 'd':
                this.popupStateService.closeSanctuaryPopup();
                this.activeGameService.tryMove(0, 1, totalColumns);
                break;
        }
    }

    handleGridCellClick(rowIndex: number, colIndex: number, cellType: CellType, item: IItem | null): void {
        this.popupStateService.closeAllPopups();

        if (!this.activeGameService.attackMode() || !this.isLocalPlayerTurn()) {
            return;
        }

        const playerAtPosition = this.activeGameService.getPlayersAtPosition(rowIndex, colIndex)[0] ?? null;
        const currentPlayer = this.activeGameService.getCurrentPlayer();
        const boardItem = item ?? this.getObjectAt(rowIndex, colIndex);

        if (this.shouldToggleDoor(cellType, playerAtPosition, boardItem)) {
            this.popupStateService.closeAllPopups();
            this.activeGameService.toggleDoor(rowIndex, colIndex);
            this.activeGameService.attackMode.set(false);
            return;
        }

        if (
            !playerAtPosition &&
            currentPlayer &&
            boardItem &&
            isSanctuaryItem(boardItem) &&
            boardItem.active !== false &&
            isPositionAdjacentToSanctuary(currentPlayer.positionGrille, boardItem)
        ) {
            this.popupStateService.openSanctuaryPopup(boardItem, rowIndex, colIndex);
        }
    }

    handlePlayerClick(playerName: string): void {
        if (!this.activeGameService.attackMode() || !this.isLocalPlayerTurn()) {
            return;
        }

        this.popupStateService.closeAllPopups();
        this.activeGameService.attackPlayer(playerName);
        this.activeGameService.attackMode.set(false);
    }

    handleCellRightClick(
        event: MouseEvent,
        rowIndex: number,
        colIndex: number,
        cellType: CellType,
        item: IItem | null = null,
    ): void {
        event.preventDefault();
        event.stopPropagation();
        this.popupStateService.closeSanctuaryPopup();

        const playerAtPosition = this.activeGameService.getPlayersAtPosition(rowIndex, colIndex)[0] ?? null;
        const boardItem = item ?? this.getObjectAt(rowIndex, colIndex);

        if (this.activeGameService.isDebugMode() && this.isLocalPlayerTurn()) {
            if (!this.isTeleportableCell(rowIndex, colIndex, cellType, boardItem)) {
                this.popupStateService.openTileInfo(cellType, boardItem, playerAtPosition);
                return;
            }
            this.popupStateService.closeTileInfo();
            this.activeGameService.debugTeleport(rowIndex, colIndex);
            return;
        }

        if (this.shouldToggleDoor(cellType, playerAtPosition, boardItem)) {
            this.popupStateService.closeTileInfo();
            this.activeGameService.toggleDoor(rowIndex, colIndex);
            this.activeGameService.attackMode.set(false);
            return;
        }

        this.popupStateService.openTileInfo(cellType, boardItem, playerAtPosition);
    }

    handleDocumentClick(event?: MouseEvent): void {
        if (event && this.isGridOrPopupClick(event.target)) {
            return;
        }

        this.popupStateService.closeAllPopups();
    }

    handleSanctuaryChoice(choice: SanctuaryChoice): void {
        const position = this.popupStateService.sanctuaryPopupPosition;
        if (!position) {
            return;
        }

        const { x, y } = position;
        this.popupStateService.closeSanctuaryPopup();
        this.activeGameService.interactSanctuary(y, x, choice);
        this.activeGameService.attackMode.set(false);
    }

    private isLocalPlayerTurn(): boolean {
        const localPlayer = this.localPlayerService.getLocalPlayer();
        if (!localPlayer) return false;
        const currentPlayer = this.activeGameService.getCurrentPlayer();
        return currentPlayer?.name === localPlayer.name;
    }

    private getObjectAt(rowIndex: number, colIndex: number): IItem | null {
        const activeGame = this.activeGameService.activeGame;

        if (!activeGame) {
            return null;
        }

        return this.boardSharedService.getObjectAt(rowIndex, colIndex, activeGame.game.board.items);
    }

    private isTeleportableCell(row: number, col: number, cellType: CellType, item: IItem | null = null): boolean {
        if (cellType === CellType.Wall || cellType === CellType.ClosedDoor) return false;
        const boardItem = item ?? this.getObjectAt(row, col);
        if (boardItem) return false;
        if (this.activeGameService.getPlayersAtPosition(row, col).length > 0) return false;
        return true;
    }

    private shouldToggleDoor(cellType: CellType, player: ICharacter | null, item: IItem | null): boolean {
        if (!this.isLocalPlayerTurn()) {
            return false;
        }

        if (cellType !== CellType.OpenDoor && cellType !== CellType.ClosedDoor) {
            return false;
        }

        if (player) {
            return false;
        }

        return item?.itemType !== ItemType.Flag;
    }

    private isGridOrPopupClick(target: EventTarget | null): boolean {
        if (!(target instanceof Element)) {
            return false;
        }

        return Boolean(target.closest('#grid-container, app-sanctuary-popup, app-tile-info-popup'));
    }
}
