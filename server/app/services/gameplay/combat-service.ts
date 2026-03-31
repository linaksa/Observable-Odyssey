import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/activeGame';
import { AttackPosture, AttackStats, CombatOutcome, CombatTurnOutcome } from '@common/attackResult';
import { CellType } from '@common/board';
import { ICharacter, Position } from '@common/character';
import { DiceType, FOUR_SIDED_DICE_MAX, ICE_CELL_MALUS, POSTURE_BONUS, SIX_SIDED_DICE_MAX, TEMPS_COMBAT } from '@common/constants';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Service } from 'typedi';
import { TurnService } from './turn-service';

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
        private turnService: TurnService,
        private readonly socketService: SocketService,
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

    async applyCombatTurn(activeGameId: string): Promise<boolean> {
        const currentActiveGame = await this.activeGameService.getActiveGameById(activeGameId);
        if (!currentActiveGame) {
            throw new Error(`Active game with id ${activeGameId} not found`);
        }

        const currentAttack = currentActiveGame.currentAttack;
        if (!currentAttack) {
            throw new Error(`No current attack found for active game with id ${activeGameId}`);
        }

        const attacker = currentActiveGame.players.find((p) => p.name === currentAttack.attacker);
        const defender = currentActiveGame.players.find((p) => p.name === currentAttack.defender);

        const attackerStats = this.getAttackStatsForPlayer(currentActiveGame, attacker, currentAttack.attackerPosture);
        const defenderStats = this.getAttackStatsForPlayer(currentActiveGame, defender, currentAttack.defenderPosture);

        const attackerNetReceivedDamage = Math.max(defenderStats.totalAttackPoints - attackerStats.totalDefensePoints, 0);
        const defenderNetReceivedDamage = Math.max(attackerStats.totalAttackPoints - defenderStats.totalDefensePoints, 0);

        attacker.currentHealth = Math.max(attacker.currentHealth - attackerNetReceivedDamage, 0);
        defender.currentHealth = Math.max(defender.currentHealth - defenderNetReceivedDamage, 0);

        currentActiveGame.currentAttack.turnCount++;
        currentActiveGame.currentAttack.attackerPosture = null;
        currentActiveGame.currentAttack.defenderPosture = null;

        const updatedGame = await this.activeGameService.saveActiveGameById(currentActiveGame._id, currentActiveGame);
        const namespace = this.socketService.getNamespace(Namespaces.Game);

        const turnResult: CombatTurnOutcome = {
            updatedActiveGame: updatedGame,
            attackerStats,
            defenderStats,
        };
        namespace.to(activeGameId).emit(SocketEvent.CombatTurnApplied, turnResult);

        const combatIsDone = attacker.currentHealth === 0 || defender.currentHealth === 0;

        return new Promise((resolve) => {
            setTimeout(async () => {
                if (combatIsDone) {
                    const combatOutcome = await this.resolveCombat(updatedGame, attacker.name, defender.name);
                    namespace.to(activeGameId).emit(SocketEvent.CombatResolved, combatOutcome);
                    return resolve(true);
                }

                namespace.to(activeGameId).emit(SocketEvent.CombatTurnStart, updatedGame);
                this.turnService.startCombatTimer(TEMPS_COMBAT, currentActiveGame, () => this.applyCombatTurn(activeGameId));
                return resolve(false);
            }, 5000);
        });
    }

    // applies combat consequences: returns an object containing the attacker's victory count and the defender's new position
    async resolveCombat(currentActiveGame: IActiveGame, attackerName: string, defenderName: string): Promise<CombatOutcome> {
        const attacker = currentActiveGame.players.find((p) => p.name === attackerName);
        const defender = currentActiveGame.players.find((p) => p.name === defenderName);

        attacker.actionsLeft--;

        let winner: ICharacter | null = null;
        let losers: ICharacter[] = [];

        if (attacker.currentHealth > 0) {
            winner = attacker;
            losers = [defender];
        } else if (defender.currentHealth > 0) {
            winner = defender;
            losers = [attacker];
        } else {
            losers = [attacker, defender];
        }

        if (winner) {
            winner.victories++;
        }

        currentActiveGame.players = currentActiveGame.players.map((player) => {
            if (player.currentHealth === 0) {
                player.currentHealth = player.initialHealth;
                this.relocateLoser(player, currentActiveGame);
            }
            return player;
        });

        const turnRemainingTime = currentActiveGame.currentAttack.suspendedTurnTimer;

        currentActiveGame.currentAttack = null; // reset current attack after resolving combat
        const updatedGame = await this.activeGameService.saveActiveGameById(currentActiveGame._id, currentActiveGame);

        const combatResult: CombatOutcome = {
            updatedActiveGame: updatedGame,
            winner: winner?.name || null,
            losers: losers.map((l) => l.name),
        };

        this.turnService.continueTurn(currentActiveGame._id.toString(), turnRemainingTime);

        return combatResult;
    }

    private relocateLoser(player: ICharacter, activeGame: IActiveGame): void {
        const positionGrille = player.positionGrille;
        const positionDepart = player.positionDepart;

        if (positionGrille.x === positionDepart.x && positionGrille.y === positionDepart.y) {
            return;
        }
        player.positionGrille = this.findNearestAvailableSpawn(positionDepart, activeGame);
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

    private rollDice(diceType: DiceType): number {
        const interval = diceType === DiceType.SixSided ? SIX_SIDED_DICE_MAX : FOUR_SIDED_DICE_MAX;
        return Math.floor(Math.random() * interval) + 1;
    }

    private getAttackStatsForPlayer(activeGame: IActiveGame, character: ICharacter, posture: AttackPosture): AttackStats {
        const cell = activeGame.game.board.cells[character.positionGrille.x][character.positionGrille.y];

        const baseAttackPoints = character.attackPoints;
        const attackDiceBonus = this.rollDice(character.attackBonusDiceType);
        const postureBonus = posture === AttackPosture.Defensive ? POSTURE_BONUS : 0;
        const iceMalus = cell === CellType.Ice ? ICE_CELL_MALUS : 0;

        const baseDefensePoints = character.defensePoints;
        const defenseDiceBonus = this.rollDice(character.defenseBonusDiceType);
        const defensePostureBonus = posture === AttackPosture.Defensive ? POSTURE_BONUS : 0;
        const defenseIceMalus = cell === CellType.Ice ? ICE_CELL_MALUS : 0;

        const totalAttackPoints = Math.max(baseAttackPoints + attackDiceBonus + postureBonus - iceMalus, 0);
        const totalDefensePoints = Math.max(baseDefensePoints + defenseDiceBonus + defensePostureBonus - defenseIceMalus, 0);

        return {
            baseAttackPoints,
            attackDiceBonus,
            postureAttackBonus: postureBonus,
            attackIceMalus: iceMalus,
            totalAttackPoints,

            baseDefensePoints,
            defenseDiceBonus,
            postureDefenseBonus: defensePostureBonus,
            defenseIceMalus: defenseIceMalus,
            totalDefensePoints,
        };
    }
}
