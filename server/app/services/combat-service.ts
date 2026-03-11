import { IActiveGame } from '@common/activeGame';
import { Position } from '@common/character';
import { Service } from 'typedi';
import { ActiveGameService } from './active-game.service';
import { CombatResult } from './interfaces/combat-result';
import { PositionValidatorService } from './position-validator.service';

@Service()
export class CombatService {
    private readonly directions: Position[] = [
        { x: 0, y: -1 }, // haut
        { x: -1, y: 0 }, // gauche
        { x: 0, y: 1 }, // bas
        { x: 1, y: 0 }, // droite
    ];

    constructor(
        private activeGameService: ActiveGameService,
        private positionValidatorService: PositionValidatorService,
    ) {}

    // vérifie si l'attaquant peut attaquer le défenseur selon les règles du jeu
    canAttack(activeGameId: string, attackerName: string, defenderName: string): boolean {
        const currentActiveGame = this.activeGameService.getActiveGameFromMemory(activeGameId);
        if (!currentActiveGame) {
            return false;
        }
        const attacker = currentActiveGame.players.find((p) => p.name === attackerName);
        const defender = currentActiveGame.players.find((p) => p.name === defenderName);
        if (!attacker || !defender) {
            return false;
        }
        if (attacker.name === defender.name) return false;
        if (attacker.hasAbandoned || defender.hasAbandoned) return false;
        const activePlayer = currentActiveGame.players[currentActiveGame.currentPlayerIndex];
        if (activePlayer.name !== attacker.name) return false;
        if (!this.positionValidatorService.isAdjacent(attacker.positionGrille, defender.positionGrille)) return false;
        return true;
    }
    // applique les conséquences du combat: retourne un objet contenant le nombre de victoire de l'attaquant et la nouvelle position du defendeur
    resolveCombat(activeGameId: string, attackerName: string, defenderName: string): CombatResult {
        const currentActiveGame = this.activeGameService.getActiveGameFromMemory(activeGameId);
        const attacker = currentActiveGame.players.find((p) => p.name === attackerName);
        const defender = currentActiveGame.players.find((p) => p.name === defenderName);
        attacker.victories++;
        defender.positionGrille = this.findNearestAvailableSpawn(defender.positionGrille, currentActiveGame);
        const combatResult: CombatResult = {
            attackerVictories: attacker.victories,
            defenderNewPosition: defender.positionGrille,
        };
        return combatResult;
    }
    // trouve la position de respawn la plus proche pour le defendeur mort en utilisant la recherche de largeur (BFS)
    findNearestAvailableSpawn(spawn: Position, currentActiveGame: IActiveGame): Position {
        const queue: Position[] = [];
        const visited = new Set<string>();

        queue.push(spawn);
        visited.add(`${spawn.x},${spawn.y}`);

        while (queue.length > 0) {
            const current = queue.shift();
            if (this.positionValidatorService.isValidRespawnTile(current, currentActiveGame)) {
                return current;
            }

            for (const dir of this.directions) {
                const next: Position = { x: current.x + dir.x, y: current.y + dir.y };
                const key = `${next.x},${next.y}`; // obligé pcq il faut que la clé soit une string pour le set
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push(next);
                }
            }
        }
        return spawn;
    }
}
