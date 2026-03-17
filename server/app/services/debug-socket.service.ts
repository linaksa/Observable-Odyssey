import { Position } from '@common/character';
import { IItem, ItemType } from '@common/items';
import { SocketEvent } from '@common/socket-events';
import { IDebugTeleportData, IDebugToggleState } from '@common/socket-payloads';
import { Socket } from 'socket.io';
import { Service } from 'typedi';
import { ActiveGameService } from './active-game.service';
import { PositionValidatorService } from './position-validator.service';

@Service()
export class DebugSocketService {
    constructor(
        private readonly activeGameService: ActiveGameService,
        private readonly positionValidatorService: PositionValidatorService,
    ) {}

    register(socket: Socket): void {
        socket.on(SocketEvent.DebugToggle, async (playerName: string, activeGameId: string) => {
            if (!activeGameId) {
                return;
            }
            try {
                const activeGame = await this.activeGameService.getActiveGameById(activeGameId);

                if (activeGame.organizerName === playerName) {
                    activeGame.isDebugMode = !activeGame.isDebugMode;
                    const payload: IDebugToggleState = { playerName, isDebugMode: activeGame.isDebugMode };
                    socket.to(activeGameId).emit(SocketEvent.DebugToggle, payload);
                    socket.emit(SocketEvent.DebugToggle, payload);
                    await this.activeGameService.saveActiveGameById(activeGameId, activeGame);
                }
            } catch {
                return;
            }
        });

        socket.on(SocketEvent.DebugTeleport, async (data: IDebugTeleportData) => {
            const { gameId, playerName, target } = data;
            try {
                const activeGame = await this.activeGameService.getActiveGameById(gameId);

                if (!activeGame.isDebugMode) return;

                // Only the current player can teleport
                const currentPlayerName = activeGame.turnOrder[activeGame.currentPlayerIndex];
                if (currentPlayerName !== playerName) return;

                const player = activeGame.players.find((p) => p.name === playerName);
                if (!player) return;

                const targetRow = target.y;
                const targetCol = target.x;

                // Target must be a walkable terrain tile
                const cellType = activeGame.game.board.cells[targetRow]?.[targetCol];
                if (!this.positionValidatorService.isWalkableCell(cellType)) return;

                // Target must have no items and no other players
                if (this.cellHasItem(activeGame.game.board.items, targetRow, targetCol)) return;
                if (this.cellHasPlayer(activeGame.players, playerName, targetRow, targetCol)) return;

                player.positionGrille.x = targetCol;
                player.positionGrille.y = targetRow;
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
                return row >= item.x && row <= item.x + 1 && col >= item.y && col <= item.y + 1;
            }
            return item.x === row && item.y === col;
        });
    }

    private cellHasPlayer(
        players: { name: string; hasAbandoned: boolean; positionGrille: Position }[],
        excludeName: string,
        row: number,
        col: number,
    ): boolean {
        return players.some((p) => !p.hasAbandoned && p.name !== excludeName && p.positionGrille.y === row && p.positionGrille.x === col);
    }
}
