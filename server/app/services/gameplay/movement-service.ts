import { MovementStep } from '@app/constants/movement';
import { AppError } from '@app/error-types/app-error';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { GameplayLogService } from '@app/services/realtime/gameplay-log.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { ICharacter, Position } from '@common/character';
import { GRASS_OR_DOOR_MOVEMENT_COST, ICE_MOVEMENT_COST, WATER_MOVEMENT_COST } from '@common/constants';
import { ErrorCode } from '@common/error-codes';
import { Namespaces } from '@common/namespaces';
import { PlayerMovedResult } from '@common/playerMovedResult';
import { SocketEvent } from '@common/socket-events';
import { StatusCodes } from 'http-status-codes';
import { Service } from 'typedi';

@Service()
export class MovementService {
    constructor(
        private readonly activeGameService: ActiveGameService,
        private readonly positionValidatorService: PositionValidatorService,
        private readonly socketService: SocketService,
        private readonly gameplayLogService: GameplayLogService,
    ) {}

    // Validates and applies the movement in a single DB access. Throws an error if invalid.
    async movePlayer(playerName: string, activeGameId: string, newPosition: Position): Promise<PlayerMovedResult> {
        const activeGame = await this.activeGameService.getActiveGameById(activeGameId);
        if (!activeGame) throw new AppError([ErrorCode.ActiveGameNotFound], StatusCodes.NOT_FOUND);

        const player = activeGame.players.find((currentPlayer) => currentPlayer.name === playerName);
        if (!player) throw new AppError([ErrorCode.PlayerNotFound], StatusCodes.NOT_FOUND);

        const currentPlayerName = activeGame.turnOrder[activeGame.currentPlayerIndex];
        if (playerName !== currentPlayerName) {
            throw new AppError([ErrorCode.NotYourTurn], StatusCodes.BAD_REQUEST);
        }
        if (activeGame.turnIsInPreparation) {
            throw new AppError([ErrorCode.TurnNotStarted], StatusCodes.BAD_REQUEST);
        }
        if (!this.positionValidatorService.isWalkable(newPosition, activeGame)) {
            throw new AppError([ErrorCode.PositionNotWalkable], StatusCodes.BAD_REQUEST);
        }
        if (!this.positionValidatorService.isAdjacent(player.currentPosition, newPosition)) {
            throw new AppError([ErrorCode.PositionNotAdjacent], StatusCodes.BAD_REQUEST);
        }
        if (this.positionValidatorService.isOccupiedByPlayer(newPosition, activeGame)) {
            throw new AppError([ErrorCode.PlayerOccupiesTarget], StatusCodes.BAD_REQUEST);
        }

        const price = this.getPriceTile(activeGame, newPosition);
        if (player.movementLeft < price) {
            throw new AppError([ErrorCode.InsufficientMovement], StatusCodes.BAD_REQUEST);
        }

        player.currentPosition = newPosition;
        player.movementLeft -= price;

        const serializedPosition = `${newPosition.x},${newPosition.y}`;
        if (!player.visitedCells.includes(serializedPosition)) {
            player.visitedCells.push(serializedPosition);
        }

        this.updateFlagPosition(activeGame, player);
        await this.activeGameService.saveActiveGameById(activeGameId, activeGame);

        return { playerId: player.name, newPosition, movementLeft: player.movementLeft };
    }

    // Returns all tiles reachable from the player's current position (budgeted BFS).
    async getReachablePositions(playerName: string, activeGameId: string): Promise<Position[]> {
        const activeGame = await this.activeGameService.getActiveGameById(activeGameId);
        if (!activeGame) return [];

        const player = activeGame.players.find((currentPlayer) => currentPlayer.name === playerName);
        if (!player) return [];

        const reachable: Position[] = [];
        const visited = new Set<string>();
        const queue: MovementStep[] = [{ pos: player.currentPosition, costSoFar: 0 }];
        visited.add(`${player.currentPosition.x},${player.currentPosition.y}`);

        while (queue.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const { pos, costSoFar } = queue.shift()!;
            const neighbors: Position[] = [
                { x: pos.x + 1, y: pos.y },
                { x: pos.x - 1, y: pos.y },
                { x: pos.x, y: pos.y + 1 },
                { x: pos.x, y: pos.y - 1 },
            ];

            for (const neighbor of neighbors) {
                const key = `${neighbor.x},${neighbor.y}`;
                if (visited.has(key)) continue;
                if (!this.positionValidatorService.isWalkable(neighbor, activeGame)) continue;
                if (this.positionValidatorService.isOccupiedByPlayer(neighbor, activeGame)) continue;

                const price = this.getPriceTile(activeGame, neighbor);
                const newCost = costSoFar + price;
                if (newCost <= player.movementLeft) {
                    visited.add(key);
                    reachable.push(neighbor);
                    queue.push({ pos: neighbor, costSoFar: newCost });
                }
            }
        }

        return reachable;
    }

    private updateFlagPosition(activeGame: IActiveGame, player: ICharacter): void {
        if (activeGame.game.gameMode !== 'ctf') return;

        const flag = activeGame.game.board.items.find((item) => item.itemType === 'flag');
        if (!flag) return;

        const playerCarriesFlag = activeGame.hasFlagId === player.name;
        // if player has the flag, it moves with them
        if (playerCarriesFlag) {
            flag.x = player.currentPosition.x;
            flag.y = player.currentPosition.y;
            return;
        }

        // if player doesn't have the flag, check if they can pick it up
        const flagIsOnGround = !activeGame.hasFlagId;
        if (flagIsOnGround && player.currentPosition.x === flag.x && player.currentPosition.y === flag.y) {
            activeGame.hasFlagId = player.name;
            if (!activeGame.flagHolderHistory.includes(player.name)) {
                activeGame.flagHolderHistory.push(player.name);
            }

            flag.isCarried = true;
            flag.x = player.currentPosition.x;
            flag.y = player.currentPosition.y;

            const namespace = this.socketService.getNamespace(Namespaces.Game);
            const gameId = activeGame._id.toString();
            namespace.to(gameId).emit(SocketEvent.FlagPickedUp, {
                playerName: player.name,
            });
            this.gameplayLogService.emitGameLogToRoom(gameId, `${player.name} a ramassé un drapeau.`);
        }
    }

    private getPriceTile(activeGame: IActiveGame, pos: Position): number {
        // guard: ensure indices exist
        if (!this.isPositionWithinBounds(pos, activeGame)) return Infinity;

        const cell = activeGame.game.board.cells[pos.y][pos.x];
        switch (cell) {
            case CellType.OpenDoor:
            case CellType.Empty:
                return GRASS_OR_DOOR_MOVEMENT_COST;
            case CellType.Ice:
                return ICE_MOVEMENT_COST;
            case CellType.Water:
                return WATER_MOVEMENT_COST;
            default:
                return Infinity;
        }
    }

    private isPositionWithinBounds(pos: Position, activeGame: IActiveGame): boolean {
        if (!activeGame?.game?.board) return false;

        const rows = activeGame.game.board.cells.length;
        if (pos.y < 0 || pos.y >= rows) return false;

        const cols = activeGame.game.board.cells[pos.y].length;
        if (pos.x < 0 || pos.x >= cols) return false;

        return true;
    }
}
