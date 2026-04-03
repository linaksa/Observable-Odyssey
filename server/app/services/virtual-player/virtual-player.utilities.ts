import { DELAY_BETWEEN_ACTIONS } from '@app/constants/virtual-players';
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

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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

        const srcIndex = from.positionGrille.y * totalColumns + from.positionGrille.x;
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
                const adjX = player.positionGrille.x + offset.x;
                const adjY = player.positionGrille.y + offset.y;

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

    async moveToPlayer(from: ICharacter, activeGame: IActiveGame, bestAdjacentIndex: number): Promise<void> {
        const namespace = this.socketService.getNamespace(Namespaces.Game);
        const totalColumns = activeGame.game.board.cells[0].length;

        const graph = buildGraph(activeGame.game.board.cells, from.actionsLeft, activeGame.game.board.items, activeGame.players);
        const srcIndex = from.positionGrille.y * totalColumns + from.positionGrille.x;
        if (srcIndex === bestAdjacentIndex) return;
        const { distances, predecessors } = dijkstra(graph, srcIndex);

        if (!isFinite(distances[bestAdjacentIndex])) {
            return;
        }

        const path = reconstructPath(predecessors, srcIndex, bestAdjacentIndex);
        path.push(bestAdjacentIndex);

        let currentIndex = srcIndex;
        let movementLeft = from.movementLeft;

        for (const step of path) {
            const nextIndex = step;

            if (movementLeft <= 0) {
                break;
            }

            // Derive current position from currentIndex, not from.positionGrille
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
                await sleep(DELAY_BETWEEN_ACTIONS);
            }

            let result;
            try {
                result = await this.movementService.movePlayer(from.name, activeGame._id, newPosition);
            } catch {
                return; // return if an error happens, be it from turn ending early, illegal move etc, we just want to stop
            }

            const stringGameId = activeGame._id.toString();
            namespace.to(stringGameId).emit(SocketEvent.PlayerMoved, {
                playerId: from.name,
                newPosition: result.newPosition,
                movementLeft: result.movementLeft,
            } as PlayerMovedResult);

            movementLeft = result.movementLeft;
            currentIndex = nextIndex;
            await sleep(DELAY_BETWEEN_ACTIONS);
        }
    }
}
