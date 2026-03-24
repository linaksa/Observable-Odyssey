import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { CombatResult } from '@app/services/interfaces/combat-result';
import { IActiveGame } from '@common/activeGame';
import { AttackPosture } from '@common/attackResult';
import { CellType } from '@common/board';
import { ICharacter, Position } from '@common/character';
import { DiceType, FOUR_SIDED_DICE_MAX, ICE_CELL_MALUS, POSTURE_BONUS, SIX_SIDED_DICE_MAX } from '@common/constants';
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

    // checks if the attacker can attack the defender according to the game rules
    async canAttack(activeGameId: string, attackerName: string, defenderName: string): Promise<boolean> {
        const currentActiveGame = await this.activeGameService.getActiveGameById(activeGameId);
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

        const activePlayerName = currentActiveGame.turnOrder[currentActiveGame.currentPlayerIndex];
        if (activePlayerName !== attacker.name) return false;
        if (attacker.actionsLeft === 0) return false;

        if (!this.positionValidatorService.isAdjacent(attacker.positionGrille, defender.positionGrille)) return false;
        return true;
    }
    // calls canAttack for each opponent to check if the attacker can attack at least one of them
    async canAttackAnyPlayer(activeGameId: string, attackerName: string): Promise<boolean> {
        const currentActiveGame = await this.activeGameService.getActiveGameById(activeGameId);
        if (!currentActiveGame) {
            return false;
        }

        for (const defender of currentActiveGame.players) {
            if (await this.canAttack(activeGameId, attackerName, defender.name)) {
                return true;
            }
        }

        return false;
    }

    async applyCombat(activeGameId: string): Promise<IActiveGame> {
        const currentActiveGame = await this.activeGameService.getActiveGameById(activeGameId);
        if (!currentActiveGame) {
            throw new Error(`Active game with id ${activeGameId} not found`);
        }

        const currentAttack = currentActiveGame.currentAttack;
        if (!currentAttack) {
            throw new Error(`No current attack found for active game with id ${activeGameId}`);
        }

        let attacker = currentActiveGame.players.find((p) => p.name === currentAttack.attacker);
        let defender = currentActiveGame.players.find((p) => p.name === currentAttack.defender);

        const attackerDamage = this.computeAttackDamage(currentActiveGame, attacker, currentAttack.attackerPosture);
        const defenderDamage = this.computeAttackDamage(currentActiveGame, defender, currentAttack.defenderPosture);

        const attackerDefensePoints = this.computeDefensePoints(currentActiveGame, attacker, currentAttack.attackerPosture, attackerDamage);
        const defenderDefensePoints = this.computeDefensePoints(currentActiveGame, defender, currentAttack.defenderPosture, defenderDamage);

        const attackerNetDamage = Math.max(defenderDamage - attackerDefensePoints, 0);
        const defenderNetDamage = Math.max(attackerDamage - defenderDefensePoints, 0);

        attacker.currentHealth = Math.max(attacker.currentHealth - attackerNetDamage, 0);
        defender.currentHealth = Math.max(defender.currentHealth - defenderNetDamage, 0);

        return currentActiveGame;
    }

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

    private computeAttackDamage(activeGame: IActiveGame, character: ICharacter, posture: AttackPosture): number {
        const cell = activeGame.game.board.cells[character.positionGrille.x][character.positionGrille.y];

        const diceBonus = this.rollDice(character.attackBonusDiceType);
        const postureBonus = posture === AttackPosture.Offensive ? POSTURE_BONUS : 0;
        const iceMalus = cell === CellType.Ice ? ICE_CELL_MALUS : 0;

        return character.attackPoints + diceBonus + postureBonus - iceMalus;
    }

    private computeDefensePoints(activeGame: IActiveGame, character: ICharacter, posture: AttackPosture, attackPoints: number): number {
        const cell = activeGame.game.board.cells[character.positionGrille.x][character.positionGrille.y];

        const diceBonus = this.rollDice(character.defenseBonusDiceType);
        const postureBonus = posture === AttackPosture.Defensive ? POSTURE_BONUS : 0;
        const iceMalus = cell === CellType.Ice ? ICE_CELL_MALUS : 0;

        return diceBonus + postureBonus - iceMalus;
    }

    private rollDice(diceType: DiceType): number {
        const interval = diceType === DiceType.SixSided ? SIX_SIDED_DICE_MAX : FOUR_SIDED_DICE_MAX;
        return Math.floor(Math.random() * interval) + 1;
    }
}
