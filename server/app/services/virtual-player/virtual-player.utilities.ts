import { DELAY_BETWEEN_ACTIONS_FACTOR, MIN_DELAY_BETWEEN_ACTIONS } from '@app/constants/virtual-players';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { MovementService } from '@app/services/gameplay/movement-service';
import { ClosestPlayerResult } from '@app/services/interfaces/closest-player-result';
import { GameplayActionService } from '@app/services/realtime/gameplay-action.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { dijkstra, DIRECTION_DELTA, indexToDirection, reconstructPath } from '@app/utils/dijkstra';
import { buildGraph } from '@app/utils/pathfinding';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { ICharacter, Position } from '@common/character';
import { IItem } from '@common/items';
import { Namespaces } from '@common/namespaces';
import { PlayerMovedResult } from '@common/playerMovedResult';
import { SocketEvent } from '@common/socket-events';
import { IDoorToggleData } from '@common/socket-payloads';
import { Service } from 'typedi';

export const sleep = (): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, Math.random() * DELAY_BETWEEN_ACTIONS_FACTOR + MIN_DELAY_BETWEEN_ACTIONS));

@Service()
export class VirtualPlayerUtilitiesService {
    constructor(
        private readonly socketService: SocketService,
        private readonly movementService: MovementService,
        private readonly gameplayActionService: GameplayActionService,
        private readonly activeGameService: ActiveGameService,
    ) {}

    findClosestReachablePlayer(from: ICharacter, players: ICharacter[], board: CellType[][], items: IItem[] = []): ClosestPlayerResult | null {
        const totalRows = board.length;
        const totalColumns = board[0].length;

        const otherPlayers = players.filter((p) => p.name !== from.name && !p.hasAbandoned);

        const graph = buildGraph(board, from.actionsLeft, items, otherPlayers);

        const srcIndex = from.currentPosition.y * totalColumns + from.currentPosition.x;
        const distances = dijkstra(graph, srcIndex).distances;

        const adjacentOffsets = [
            { x: 0, y: -1 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 1, y: 0 },
        ];

        let closest: ClosestPlayerResult | null = null;

        for (const player of otherPlayers) {
            let minAdjacentDistance = Infinity;
            let bestAdjIdx = -1;

            for (const offset of adjacentOffsets) {
                const adjX = player.currentPosition.x + offset.x;
                const adjY = player.currentPosition.y + offset.y;

                if (adjX < 0 || adjX >= totalColumns || adjY < 0 || adjY >= totalRows) continue;

                const adjIndex = adjY * totalColumns + adjX;
                const dist = distances[adjIndex];

                if (isFinite(dist) && dist < minAdjacentDistance) {
                    minAdjacentDistance = dist;
                    bestAdjIdx = adjIndex;
                }
            }

            if (!isFinite(minAdjacentDistance)) continue;

            if (closest === null || minAdjacentDistance < closest.distance) {
                closest = { player, distance: minAdjacentDistance, bestAdjacentIndex: bestAdjIdx };
            }
        }

        return closest;
    }

    async moveToPlayer(from: ICharacter, activeGame: IActiveGame, bestAdjacentIndex: number): Promise<boolean> {
        return await this.moveToIndex(from, activeGame, bestAdjacentIndex);
    }

    async moveToPosition(from: ICharacter, activeGame: IActiveGame, position: Position): Promise<boolean> {
        const board = activeGame.game.board.cells;
        if (!this.isWithinBounds(position, board)) {
            return false;
        }

        const totalColumns = board[0].length;
        const targetIndex = position.y * totalColumns + position.x;
        return await this.moveToIndex(from, activeGame, targetIndex);
    }

    async moveToPositionOrNearest(from: ICharacter, activeGame: IActiveGame, position: Position): Promise<boolean> {
        const board = activeGame.game.board.cells;
        if (!this.isWithinBounds(position, board)) {
            return false;
        }

        const totalColumns = board[0].length;
        const targetIndex = position.y * totalColumns + position.x;

        const graph = buildGraph(board, from.actionsLeft, activeGame.game.board.items, activeGame.players);
        const srcIndex = from.currentPosition.y * totalColumns + from.currentPosition.x;
        const { distances } = dijkstra(graph, srcIndex);

        if (isFinite(distances[targetIndex])) {
            return await this.moveToIndex(from, activeGame, targetIndex);
        }

        const closestReachableIndex = this.findClosestReachableIndexToTarget(distances, totalColumns, position, from.movementLeft, srcIndex);
        if (closestReachableIndex === srcIndex) {
            return false;
        }

        await this.moveToIndex(from, activeGame, closestReachableIndex);
        return false;
    }

    async moveAwayFromPlayers(from: ICharacter, activeGame: IActiveGame, adversePlayers: ICharacter[]): Promise<void> {
        if (adversePlayers.length === 0 || from.movementLeft <= 0) {
            return;
        }

        const totalColumns = activeGame.game.board.cells[0].length;
        const graph = buildGraph(activeGame.game.board.cells, from.actionsLeft, activeGame.game.board.items, activeGame.players);
        const srcIndex = from.currentPosition.y * totalColumns + from.currentPosition.x;
        const { distances } = dijkstra(graph, srcIndex);

        let bestIndex = srcIndex;
        let bestThreatDistance = this.getMinimumThreatDistance(srcIndex, totalColumns, adversePlayers);
        let bestPathCost = 0;

        for (let index = 0; index < distances.length; index++) {
            const pathCost = distances[index];
            if (!isFinite(pathCost) || pathCost === 0 || pathCost > from.movementLeft) {
                continue;
            }

            const threatDistance = this.getMinimumThreatDistance(index, totalColumns, adversePlayers);
            if (threatDistance > bestThreatDistance || (threatDistance === bestThreatDistance && pathCost > bestPathCost)) {
                bestIndex = index;
                bestThreatDistance = threatDistance;
                bestPathCost = pathCost;
            }
        }

        if (bestIndex === srcIndex) {
            return;
        }

        await this.moveToIndex(from, activeGame, bestIndex);
    }

    private getMinimumThreatDistance(index: number, totalColumns: number, adversePlayers: ICharacter[]): number {
        const x = index % totalColumns;
        const y = Math.floor(index / totalColumns);

        let minimumDistance = Infinity;
        for (const adversePlayer of adversePlayers) {
            const distance = Math.abs(adversePlayer.currentPosition.x - x) + Math.abs(adversePlayer.currentPosition.y - y);
            if (distance < minimumDistance) {
                minimumDistance = distance;
            }
        }

        return minimumDistance;
    }

    private async moveToIndex(from: ICharacter, activeGame: IActiveGame, targetIndex: number): Promise<boolean> {
        const namespace = this.socketService.getNamespace(Namespaces.Game);
        const totalColumns = activeGame.game.board.cells[0].length;

        const graph = buildGraph(activeGame.game.board.cells, from.actionsLeft, activeGame.game.board.items, activeGame.players);
        const srcIndex = from.currentPosition.y * totalColumns + from.currentPosition.x;
        if (srcIndex === targetIndex) return true;
        const { distances, predecessors } = dijkstra(graph, srcIndex);

        if (!isFinite(distances[targetIndex])) {
            return false;
        }

        const path = reconstructPath(predecessors, srcIndex, targetIndex);
        path.push(targetIndex);

        let currentIndex = srcIndex;
        let movementLeft = from.movementLeft;

        for (const step of path) {
            const nextIndex = step;

            if (movementLeft <= 0) {
                break;
            }

            // Derive current position from currentIndex, not from.currentPosition
            const currentX = currentIndex % totalColumns;
            const currentY = Math.floor(currentIndex / totalColumns);

            const direction = indexToDirection(currentIndex, nextIndex, totalColumns);
            const delta = DIRECTION_DELTA[direction];
            const newPosition: Position = {
                x: currentX + delta.x,
                y: currentY + delta.y,
            };

            if (activeGame.game.board.cells[newPosition.y][newPosition.x] === CellType.ClosedDoor) {
                if (from.actionsLeft <= 0) {
                    break;
                }

                const doorToggleData: IDoorToggleData = {
                    gameId: activeGame._id.toString(),
                    playerId: from.name,
                    position: newPosition,
                };
                await this.gameplayActionService.handleToggleDoor(
                    doorToggleData,
                    null,
                    namespace,
                    this.gameplayActionService.emitGameLogToRoom.bind(this.gameplayActionService),
                );
                activeGame = await this.activeGameService.getActiveGameById(activeGame._id);
                await sleep();
            }

            let result;
            try {
                result = await this.movementService.movePlayer(from.name, activeGame._id, newPosition);
                from.positionGrille = newPosition;
            } catch {
                return false;
            }

            const stringGameId = activeGame._id.toString();
            namespace.to(stringGameId).emit(SocketEvent.PlayerMoved, {
                playerId: from.name,
                newPosition: result.newPosition,
                movementLeft: result.movementLeft,
            } as PlayerMovedResult);

            movementLeft = result.movementLeft;
            currentIndex = nextIndex;
            await sleep();
        }

        return currentIndex === targetIndex;
    }

    private findClosestReachableIndexToTarget(
        distances: number[],
        totalColumns: number,
        targetPosition: Position,
        movementLeft: number,
        srcIndex: number,
    ): number {
        let bestIndex = srcIndex;
        let bestDistanceToTarget = this.getManhattanDistanceFromIndex(srcIndex, totalColumns, targetPosition);
        let bestPathCost = 0;

        for (let index = 0; index < distances.length; index++) {
            const pathCost = distances[index];
            if (!isFinite(pathCost) || pathCost === 0 || pathCost > movementLeft) {
                continue;
            }

            const distanceToTarget = this.getManhattanDistanceFromIndex(index, totalColumns, targetPosition);
            if (distanceToTarget < bestDistanceToTarget || (distanceToTarget === bestDistanceToTarget && pathCost > bestPathCost)) {
                bestIndex = index;
                bestDistanceToTarget = distanceToTarget;
                bestPathCost = pathCost;
            }
        }

        return bestIndex;
    }

    private getManhattanDistanceFromIndex(index: number, totalColumns: number, targetPosition: Position): number {
        const x = index % totalColumns;
        const y = Math.floor(index / totalColumns);
        return Math.abs(x - targetPosition.x) + Math.abs(y - targetPosition.y);
    }

    private isWithinBounds(position: Position, board: CellType[][]): boolean {
        return position.y >= 0 && position.y < board.length && position.x >= 0 && position.x < board[0].length;
    }
}
