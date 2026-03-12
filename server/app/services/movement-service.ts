import { activeGameModel } from '@app/schemas/active-game';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { Position } from '@common/character';
import { PRIX_EAU, PRIX_GLACE, PRIX_PORTE_GAZON } from '@common/constants';
import { Service } from 'typedi';
import { ActiveGameService } from './active-game.service';
import { PositionValidatorService } from './position-validator.service';

@Service()
export class MovementService {
    constructor(
        private readonly activeGameService: ActiveGameService,
        private readonly positionValidatorService: PositionValidatorService,
    ) {}

    // Valide et applique le déplacement en un seul accès DB. Lance une erreur si invalide.
    async movePlayer(playerName: string, activeGameId: string, newPosition: Position): Promise<{ newPosition: Position; movementLeft: number }> {
        const activeGame = await activeGameModel.findById(activeGameId);
        if (!activeGame) throw new Error(`activeGame introuvable pour id=${activeGameId}`);
        const player = activeGame.players.find((p) => p.name === playerName);
        if (!player) throw new Error(`joueur '${playerName}' introuvable`);

        const currentPlayerName = activeGame.turnOrder[activeGame.currentPlayerIndex];
        if (playerName !== currentPlayerName) {
            throw new Error(`Ce n'est pas le tour de '${playerName}'`);
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
        await activeGame.save();
        return { newPosition, movementLeft: player.movementLeft };
    }

    // Retourne toutes les cases atteignables depuis la position actuelle du joueur (BFS avec budget).
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
