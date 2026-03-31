import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { ICharacter, Position } from '@common/character';
import { PRIX_EAU, PRIX_GLACE, PRIX_PORTE_GAZON } from '@common/constants';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Service } from 'typedi';

@Service()
export class MovementService {
    constructor(
        private readonly activeGameService: ActiveGameService,
        private readonly positionValidatorService: PositionValidatorService,
        private readonly socketService: SocketService,
    ) {}

    // Validates and applies the movement in a single DB access. Throws an error if invalid.
    async movePlayer(playerName: string, activeGameId: string, newPosition: Position): Promise<{ newPosition: Position; movementLeft: number }> {
        const activeGame = await this.activeGameService.getActiveGameById(activeGameId);
        if (!activeGame) throw new Error(`activeGame introuvable pour id=${activeGameId}`);
        const player = activeGame.players.find((p) => p.name === playerName);
        if (!player) throw new Error(`joueur '${playerName}' introuvable`);

        const currentPlayerName = activeGame.turnOrder[activeGame.currentPlayerIndex];
        if (playerName !== currentPlayerName) {
            throw new Error(`Ce n'est pas le tour de '${playerName}'`);
        }
        if (activeGame.turnIsInPreparation) {
            throw new Error(`Le tour de '${playerName}' n'a pas encore commencé`);
        }
        if (!this.positionValidatorService.isWalkable(newPosition, activeGame)) {
            throw new Error('Position non marchable');
        }
        if (!this.positionValidatorService.isAdjacent(player.positionGrille, newPosition)) {
            throw new Error(`Position non adjacente: de ${JSON.stringify(player.positionGrille)} vers ${JSON.stringify(newPosition)}`);
        }
        if (this.positionValidatorService.isOccupiedByPlayer(newPosition, activeGame)) {
            throw new Error('Case occupée par un autre joueur');
        }
        const price = this.getPriceTile(activeGame, newPosition);
        if (player.movementLeft < price) {
            throw new Error(`Mouvements insuffisants (restant: ${player.movementLeft}, coût: ${price})`);
        }

        player.positionGrille = newPosition;
        player.movementLeft -= price;

        const serializedPos = `${newPosition.x},${newPosition.y}`;
        if (!player.visitedCells.includes(serializedPos)) {
            player.visitedCells.push(serializedPos);
        }

        this.updateFlagPosition(activeGame, player);
        await this.activeGameService.saveActiveGameById(activeGameId, activeGame);
        return { newPosition, movementLeft: player.movementLeft };
    }

    // Returns all tiles reachable from the player's current position (budgeted BFS).
    async getReachablePositions(playerName: string, activeGameId: string): Promise<Position[]> {
        const activeGame = await this.activeGameService.getActiveGameById(activeGameId);
        if (!activeGame) return [];
        const player = activeGame.players.find((p) => p.name === playerName);
        if (!player) return [];

        const reachable: Position[] = [];
        const visited = new Set<string>();
        const queue: { pos: Position; costSoFar: number }[] = [{ pos: player.positionGrille, costSoFar: 0 }];
        visited.add(`${player.positionGrille.x},${player.positionGrille.y}`);

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
            flag.x = player.positionGrille.x;
            flag.y = player.positionGrille.y;
            return;
        }
        // if player doesn't have the flag, check if they can pick it up
        const flagIsOnGround = !activeGame.hasFlagId;
        if (flagIsOnGround && player.positionGrille.x === flag.x && player.positionGrille.y === flag.y) {
            activeGame.hasFlagId = player.name;
            flag.isCarried = true;
            flag.x = player.positionGrille.x;
            flag.y = player.positionGrille.y;
            const namespace = this.socketService.getNamespace(Namespaces.Game);
            namespace.to(activeGame._id.toString()).emit(SocketEvent.FlagPickedUp, {
                playerName: player.name,
            });
        }
    }

    private getPriceTile(activeGame: IActiveGame, pos: Position): number {
        // guard: ensure indices exist
        if (!this.isPositionWithinBounds(pos, activeGame)) return Infinity;

        const cell = activeGame.game.board.cells[pos.y][pos.x];
        switch (cell) {
            case CellType.OpenDoor:
            case CellType.Empty:
                return PRIX_PORTE_GAZON;
            case CellType.Ice:
                return PRIX_GLACE;
            case CellType.Water:
                return PRIX_EAU;
            default:
                return Infinity;
        }
    }

    private isPositionWithinBounds(pos: Position, activeGame: IActiveGame): boolean {
        if (!activeGame || !activeGame.game || !activeGame.game.board || !Array.isArray(activeGame.game.board.cells)) return false;
        const rows = activeGame.game.board.cells.length;
        if (pos.y < 0 || pos.y >= rows) return false;
        const cols = activeGame.game.board.cells[pos.y].length;
        if (pos.x < 0 || pos.x >= cols) return false;
        return true;
    }
}
