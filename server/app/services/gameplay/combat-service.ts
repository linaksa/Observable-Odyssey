import { AppError } from '@app/error-types/app-error';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/activeGame';
import { AttackPosture, AttackStats, CombatOutcome, CombatTurnOutcome } from '@common/attackResult';
import { CellType } from '@common/board';
import { ICharacter, Position } from '@common/character';
import {
    COMBAT_TURN_FEEDBACK_DURATION_MS,
    DiceType,
    FOUR_SIDED_DICE_MAX,
    ICE_CELL_MALUS,
    POSTURE_BONUS,
    SIX_SIDED_DICE_MAX,
    COMBAT_TIME_MS,
} from '@common/constants';
import { ErrorCode } from '@common/error-codes';
import { ItemType } from '@common/items';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { StatusCodes } from 'http-status-codes';
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

    async applyCombatTurn(activeGameId: string): Promise<boolean> {
        const currentActiveGame = await this.activeGameService.getActiveGameById(activeGameId);
        if (!currentActiveGame) {
            throw new AppError([ErrorCode.ActiveGameNotFound], StatusCodes.NOT_FOUND);
        }

        const currentAttack = currentActiveGame.currentAttack;
        if (!currentAttack) {
            throw new AppError([ErrorCode.NoOngoingAttack], StatusCodes.BAD_REQUEST);
        }

        const attacker = currentActiveGame.players.find((p) => p.name === currentAttack.attacker);
        const defender = currentActiveGame.players.find((p) => p.name === currentAttack.defender);

        const attackerStats = this.getAttackStatsForPlayer(currentActiveGame, attacker, currentAttack.attackerPosture);
        const defenderStats = this.getAttackStatsForPlayer(currentActiveGame, defender, currentAttack.defenderPosture);

        const attackerNetDealtDamage = Math.max(attackerStats.totalAttackPoints - defenderStats.totalDefensePoints, 0);
        const defenderNetDealtDamage = Math.max(defenderStats.totalAttackPoints - attackerStats.totalDefensePoints, 0);

        const attackerDealtDamage = Math.min(attackerNetDealtDamage, defender.currentHealth);
        const defenderDealtDamage = Math.min(defenderNetDealtDamage, attacker.currentHealth);

        attacker.currentHealth = Math.max(attacker.currentHealth - defenderDealtDamage, 0);
        defender.currentHealth = Math.max(defender.currentHealth - attackerDealtDamage, 0);

        // Save stats about the combat
        attacker.totalDamageDealt += attackerDealtDamage;
        attacker.totalDamageReceived += defenderDealtDamage;
        defender.totalDamageDealt += defenderDealtDamage;
        defender.totalDamageReceived += attackerDealtDamage;

        currentActiveGame.currentAttack.turnCount++;
        currentActiveGame.currentAttack.attackerPosture = null;
        currentActiveGame.currentAttack.defenderPosture = null;

        const updatedGame = await this.activeGameService.saveActiveGameById(currentActiveGame._id, currentActiveGame);
        const namespace = this.socketService.getNamespace(Namespaces.Game);

        const turnResult: CombatTurnOutcome = {
            updatedActiveGame: updatedGame,
            attackerStats,
            defenderStats,

            attackerReceivedDamage: defenderDealtDamage,
            defenderReceivedDamage: attackerDealtDamage,
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
                this.turnService.startCombatTimer(COMBAT_TIME_MS, currentActiveGame, () => this.applyCombatTurn(activeGameId));
                return resolve(false);
            }, COMBAT_TURN_FEEDBACK_DURATION_MS);
        });
    }

    // applies combat consequences: returns an object containing the attacker's victory count and the defender's new position
    async resolveCombat(currentActiveGame: IActiveGame, attackerName: string, defenderName: string): Promise<CombatOutcome> {
        const attacker = currentActiveGame.players.find((p) => p.name === attackerName);
        const defender = currentActiveGame.players.find((p) => p.name === defenderName);

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

        return this.endAndCleanupCombat(currentActiveGame, winner, losers, false);
    }

    private async endAndCleanupCombat(
        activeGame: IActiveGame,
        winner: ICharacter | null,
        losers: ICharacter[],
        cancelled: boolean,
    ): Promise<CombatOutcome> {
        const carrierDefeatPosition = this.getFlagCarrierDefeatPosition(activeGame);

        const attacker = activeGame.players.find((p) => p.name === activeGame.currentAttack.attacker);
        attacker.actionsLeft--;

        if (winner) {
            winner.victories++;
            winner.nVictories++;
            winner.nCombats++;
        }

        activeGame.players = activeGame.players.map((player) => {
            if (player.currentHealth === 0) {
                player.currentHealth = player.initialHealth;
                this.relocateLoser(player, activeGame);
                player.nDefeats++;
                player.nCombats++;
            }
            return player;
        });

        this.dropFlagAtPositionIfCarrierDefeated(activeGame, carrierDefeatPosition);

        const turnRemainingTime = activeGame.currentAttack.suspendedTurnTimer;

        activeGame.currentAttack = null; // reset current attack after resolving combat
        const updatedGame = await this.activeGameService.saveActiveGameById(activeGame._id, activeGame);

        const combatResult: CombatOutcome = {
            updatedActiveGame: updatedGame,
            winner: winner?.name || null,
            losers: losers.map((l) => l.name),
            cancelled,
        };

        this.turnService.continueTurn(activeGame._id.toString(), turnRemainingTime);

        return combatResult;
    }

    private getFlagCarrierDefeatPosition(activeGame: IActiveGame): Position | null {
        if (activeGame.game.gameMode !== 'ctf' || !activeGame.hasFlagId) {
            return null;
        }

        const carrier = activeGame.players.find((player) => player.name === activeGame.hasFlagId);
        if (!carrier || carrier.currentHealth > 0) {
            return null;
        }

        return carrier.currentPosition;
    }

    private dropFlagAtPositionIfCarrierDefeated(activeGame: IActiveGame, position: Position | null): void {
        if (!position) {
            return;
        }

        const flag = activeGame.game.board.items.find((item) => item.itemType === ItemType.Flag);
        if (!flag) {
            return;
        }

        activeGame.hasFlagId = '';
        flag.isCarried = false;
        flag.x = position.x;
        flag.y = position.y;
    }

    private relocateLoser(player: ICharacter, activeGame: IActiveGame): void {
        const currentPosition = player.currentPosition;
        const startingPosition = player.startingPosition;

        if (currentPosition.x === startingPosition.x && currentPosition.y === startingPosition.y) {
            return;
        }
        player.currentPosition = this.findNearestAvailableSpawn(startingPosition, activeGame);
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
        const cell = activeGame.game.board.cells[character.currentPosition.x][character.currentPosition.y];

        const baseAttackPoints = character.attackPoints;
        let attackDiceBonus: number;
        if (!activeGame.isDebugMode) {
            attackDiceBonus = this.rollDice(character.attackBonusDiceType);
        } else {
            attackDiceBonus = this.getMaxDice(character.attackBonusDiceType, character.name, activeGame);
        }

        const attackPostureBonus = posture === AttackPosture.Offensive ? POSTURE_BONUS : 0;
        const attackIceMalus = cell === CellType.Ice ? ICE_CELL_MALUS : 0;

        const baseDefensePoints = character.defensePoints;

        const defensePostureBonus = posture === AttackPosture.Defensive ? POSTURE_BONUS : 0;
        const defenseIceMalus = cell === CellType.Ice ? ICE_CELL_MALUS : 0;
        let defenseDiceBonus: number;
        if (!activeGame.isDebugMode) {
            defenseDiceBonus = this.rollDice(character.defenseBonusDiceType);
        } else {
            defenseDiceBonus = this.getMaxDice(character.defenseBonusDiceType, character.name, activeGame);
        }
        const totalAttackPoints = Math.max(baseAttackPoints + attackDiceBonus + attackPostureBonus + attackIceMalus, 0);
        const totalDefensePoints = Math.max(baseDefensePoints + defenseDiceBonus + defensePostureBonus + defenseIceMalus, 0);

        return {
            baseAttackPoints,
            attackDiceBonus,
            postureAttackBonus: attackPostureBonus,
            attackIceMalus,
            totalAttackPoints,

            baseDefensePoints,
            defenseDiceBonus,
            postureDefenseBonus: defensePostureBonus,
            defenseIceMalus,
            totalDefensePoints,
        };
    }

    private getMaxDice(dice: DiceType, name: string, activeGame: IActiveGame): number {
        let attackDiceBonus: number;
        if (activeGame.currentAttack.attacker === name) {
            attackDiceBonus = dice === DiceType.SixSided ? SIX_SIDED_DICE_MAX : FOUR_SIDED_DICE_MAX;
        } else {
            attackDiceBonus = 1;
        }

        return attackDiceBonus;
    }

    async cancelCombat(activeGame: IActiveGame, abandonedPlayerId: string): Promise<CombatOutcome | null> {
        if (!activeGame.currentAttack) {
            return null;
        }

        this.turnService.clearCombatTimer(activeGame);

        const attacker = activeGame.currentAttack?.attacker;
        const defender = activeGame.currentAttack?.defender;

        const winner = attacker === abandonedPlayerId ? defender : attacker;
        const winnerCharacter = activeGame.players.find((p) => p.name === winner);

        const loser = activeGame.players.find((p) => p.name === abandonedPlayerId) as ICharacter;

        return this.endAndCleanupCombat(activeGame, winnerCharacter || null, [loser], true);
    }
}
