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
    // vérifie si un joueur peut se déplacer vers une nouvelle position selon les règles du jeu
    canMove(playerName: string, activeGameId: string, newPosition: Position): boolean {
        const activeGame = this.activeGameService.getActiveGameFromMemory(activeGameId);
        const player = activeGame.players.find((p) => p.name === playerName);
        // Vérifie que la case est valide
        if (!this.positionValidatorService.isWalkable(newPosition, activeGame)) return false;
        // Vérifie si le joueur a des mouvements restants
        if (player.movementLeft < this.getPriceTile(activeGame, newPosition)) return false;
        // Vérifie que la nouvelle position est adjacente à la position actuelle du joueur
        if (!this.positionValidatorService.isAdjacent(player.positionGrille, newPosition)) return false;
        // Vérifie qu'il n'y a pas déjà un joueur sur la case
        if (this.positionValidatorService.isOccupiedByPlayer(newPosition, activeGame)) return false;
        return true;
    }
    // Logique pour déplacer le joueur sur la grille
    movePlayer(playerName: string, activeGameId: string, newPosition: Position): Position {
        const activeGame = this.activeGameService.getActiveGameFromMemory(activeGameId);
        const player = activeGame.players.find((p) => p.name === playerName);
        player.positionGrille = newPosition;
        player.movementLeft -= this.getPriceTile(activeGame, newPosition);
        return newPosition;
    }
    // retourne les positions atteignables pour un joueur qui veut se déplacer dans le tour actuel
    getReachablePositions(playerName: string, activeGameId: string): Position[] {
        const activeGame = this.activeGameService.getActiveGameFromMemory(activeGameId);
        const player = activeGame.players.find((p) => p.name === playerName);
        const { x, y } = player.positionGrille;
        const possibleMoves: Position[] = [
            { x: x + 1, y },
            { x: x - 1, y },
            { x, y: y + 1 },
            { x, y: y - 1 },
        ];
        return possibleMoves.filter((pos) => this.canMove(playerName, activeGameId, pos));
    }
    // retourne le coût de déplacement d'une case selon son type
    private getPriceTile(activeGame: IActiveGame, pos: Position): number {
        const cell = activeGame.game.board.cells[pos.y][pos.x];
        switch (cell) {
            case CellType.OpenDoor || CellType.Empty:
                return PRIX_PORTE_GAZON;
            case CellType.Ice:
                return PRIX_GLACE;
            case CellType.Water:
                return PRIX_EAU;
            default:
                return Infinity; // Impossible
        }
    }
}
