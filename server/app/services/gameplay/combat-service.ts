import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { CombatResult } from '@app/services/interfaces/combat-result';
import { IActiveGame } from '@common/activeGame';
import { Position } from '@common/character';
import { Service } from 'typedi';

@Service()
export class CombatService {
    private readonly directions: Position[] = [
        { x: 0, y: -1 }, // up
        { x: -1, y: 0 }, // left
        { x: 0, y: 1 }, // down
        { x: 1, y: 0 }, // right
    ];

    constructor(
        private activeGameService: ActiveGameService,
        private positionValidatorService: PositionValidatorService,
    ) {}

    // applies combat consequences: returns an object containing the attacker's victory count and the defender's new position
    async resolveCombat(activeGameId: string, attackerName: string, defenderName: string): Promise<CombatResult> {
        const currentActiveGame = await this.activeGameService.getActiveGameById(activeGameId);
        const attacker = currentActiveGame?.players.find((p) => p.name === attackerName);
        const defender = currentActiveGame?.players.find((p) => p.name === defenderName);
        if (!currentActiveGame || !attacker || !defender) {
            throw new Error(`resolveCombat called with invalid state: ${activeGameId}`);
        }
        attacker.actionsLeft--;
        attacker.victories++;
        if (defender.positionGrille.x !== defender.positionDepart.x || defender.positionGrille.y !== defender.positionDepart.y)
            defender.positionGrille = this.findNearestAvailableSpawn(defender.positionDepart, currentActiveGame);
        const combatResult: CombatResult = {
            attackerVictories: attacker.victories,
            defenderNewPosition: defender.positionGrille,
            attackerActionsLeft: attacker.actionsLeft,
        };
        await this.activeGameService.saveActiveGameById(currentActiveGame._id, currentActiveGame);
        return combatResult;
    }
    // finds the nearest available respawn position for the dead defender using breadth-first search (BFS)
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
                const key = `${next.x},${next.y}`; // required because the key must be a string for the Set
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push(next);
                }
            }
        }
        return spawn;
    }
}
