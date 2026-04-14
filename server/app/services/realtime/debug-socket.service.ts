import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { GameplayLogService } from '@app/services/realtime/gameplay-log.service';
import { Position } from '@common/character';
import { IItem, ItemType } from '@common/items';
import { SocketEvent } from '@common/socket-events';
import { IDebugTeleportData, IDebugToggleState } from '@common/socket-payloads';
import { Socket } from 'socket.io';
import { Service } from 'typedi';

@Service()
export class DebugSocketService {
    constructor(
        private readonly activeGameService: ActiveGameService,
        private readonly positionValidatorService: PositionValidatorService,
        private readonly gameplayLogService: GameplayLogService,
    ) {}

    register(socket: Socket): void {
        socket.on(SocketEvent.DebugToggle, async (playerName: string, activeGameId: string) => {
            if (!activeGameId) {
                return;
            }

            try {
                const activeGame = await this.activeGameService.getActiveGameById(activeGameId);
                if (activeGame.organizerName !== playerName) {
                    return;
                }

                activeGame.isDebugMode = !activeGame.isDebugMode;
                const payload: IDebugToggleState = { playerName, isDebugMode: activeGame.isDebugMode };
                socket.to(activeGameId).emit(SocketEvent.DebugToggle, payload);
                socket.emit(SocketEvent.DebugToggle, payload);

                const statusLabel = activeGame.isDebugMode ? 'activé' : 'désactivé';
                this.gameplayLogService.emitGameLogToRoom(activeGameId, `Mode debug ${statusLabel} par ${playerName}.`);
                await this.activeGameService.saveActiveGameById(activeGameId, activeGame);
            } catch {
                return;
            }
        });

        socket.on(SocketEvent.DebugTeleport, async (data: IDebugTeleportData) => {
            const { gameId, playerName, target } = data;
            try {
                const activeGame = await this.activeGameService.getActiveGameById(gameId);

                if (!activeGame.isDebugMode) return;
                if (activeGame.turnIsInPreparation) return;

                const currentPlayerName = activeGame.turnOrder[activeGame.currentPlayerIndex];
                if (currentPlayerName !== playerName) return;

                const player = activeGame.players.find((currentPlayer) => currentPlayer.name === playerName);
                if (!player) return;

                const targetRow = target.y;
                const targetCol = target.x;

                const cellType = activeGame.game.board.cells[targetRow]?.[targetCol];
                if (!this.positionValidatorService.isWalkableCell(cellType)) return;
                if (this.cellHasItem(activeGame.game.board.items, targetRow, targetCol)) return;
                if (this.cellHasPlayer(activeGame.players, playerName, targetRow, targetCol)) return;

                player.currentPosition.x = targetCol;
                player.currentPosition.y = targetRow;
                await this.activeGameService.saveActiveGameById(gameId, activeGame);

                const movedResult = { playerId: playerName, newPosition: target, movementLeft: player.movementLeft };
                socket.to(gameId).emit(SocketEvent.PlayerMoved, movedResult);
                socket.emit(SocketEvent.PlayerMoved, movedResult);
            } catch {
                return;
            }
        });
    }

    private cellHasItem(items: IItem[], row: number, col: number): boolean {
        return items.some((item) => {
            if (item.isCarried) return false;
            if (item.itemType === ItemType.StartingPosition) return false;
            if (item.itemType === ItemType.LifeSanctuary || item.itemType === ItemType.FightSanctuary) {
                return row >= item.y && row <= item.y + 1 && col >= item.x && col <= item.x + 1;
            }

            return item.x === col && item.y === row;
        });
    }

    private cellHasPlayer(
        players: { name: string; hasAbandoned: boolean; currentPosition: Position }[],
        excludeName: string,
        row: number,
        col: number,
    ): boolean {
        return players.some(
            (player) =>
                !player.hasAbandoned && player.name !== excludeName && player.currentPosition.y === row && player.currentPosition.x === col,
        );
    }
}
