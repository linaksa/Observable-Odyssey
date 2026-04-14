import { GameplayLogService } from '@app/services/realtime/gameplay-log.service';
import { CombatExchangeLogData, CombatTurnLogData, DEFENSE_SANCTUARY_BONUS, StatBreakdownData } from '@common/combat-log';
import { Service } from 'typedi';

@Service()
export class CombatLogService {
    constructor(private readonly gameplayLogService: GameplayLogService) {}

    emitPrivateCombatTurnLogs(data: CombatTurnLogData): void {
        const { gameId, attackerName, defenderName, combatTurnNumber, attackerStats, defenderStats, attackerDealtDamage, defenderDealtDamage } =
            data;

        const attackerDifference = attackerStats.totalAttackPoints - defenderStats.totalDefensePoints;
        const defenderDifference = defenderStats.totalAttackPoints - attackerStats.totalDefensePoints;

        const firstExchangeLog = this.buildCombatExchangeMessage({
            attackingPlayerName: attackerName,
            defendingPlayerName: defenderName,
            attackData: {
                base: attackerStats.baseAttackPoints,
                diceBonus: attackerStats.attackDiceBonus,
                postureBonus: attackerStats.postureAttackBonus,
                sanctuaryBonus: attackerStats.fightSanctuaryBonus,
                iceMalus: attackerStats.attackIceMalus,
                total: attackerStats.totalAttackPoints,
            },
            defenseData: {
                base: defenderStats.baseDefensePoints,
                diceBonus: defenderStats.defenseDiceBonus,
                postureBonus: defenderStats.postureDefenseBonus,
                sanctuaryBonus: DEFENSE_SANCTUARY_BONUS,
                iceMalus: defenderStats.defenseIceMalus,
                total: defenderStats.totalDefensePoints,
            },
            comparison: {
                attackTotal: attackerStats.totalAttackPoints,
                defenseTotal: defenderStats.totalDefensePoints,
                difference: attackerDifference,
                damage: attackerDealtDamage,
            },
        });

        const secondExchangeLog = this.buildCombatExchangeMessage({
            attackingPlayerName: defenderName,
            defendingPlayerName: attackerName,
            attackData: {
                base: defenderStats.baseAttackPoints,
                diceBonus: defenderStats.attackDiceBonus,
                postureBonus: defenderStats.postureAttackBonus,
                sanctuaryBonus: defenderStats.fightSanctuaryBonus,
                iceMalus: defenderStats.attackIceMalus,
                total: defenderStats.totalAttackPoints,
            },
            defenseData: {
                base: attackerStats.baseDefensePoints,
                diceBonus: attackerStats.defenseDiceBonus,
                postureBonus: attackerStats.postureDefenseBonus,
                sanctuaryBonus: DEFENSE_SANCTUARY_BONUS,
                iceMalus: attackerStats.defenseIceMalus,
                total: attackerStats.totalDefensePoints,
            },
            comparison: {
                attackTotal: defenderStats.totalAttackPoints,
                defenseTotal: attackerStats.totalDefensePoints,
                difference: defenderDifference,
                damage: defenderDealtDamage,
            },
        });

        const targetPlayers = [attackerName, defenderName];
        this.gameplayLogService.emitPrivateGameLogToPlayers(gameId, targetPlayers, `Tour de combat #${combatTurnNumber}`);
        this.gameplayLogService.emitPrivateGameLogToPlayers(gameId, targetPlayers, firstExchangeLog);
        this.gameplayLogService.emitPrivateGameLogToPlayers(gameId, targetPlayers, secondExchangeLog);
    }

    emitPublicGameLog(gameId: string, message: string): void {
        this.gameplayLogService.emitGameLogToRoom(gameId, message);
    }

    private buildAttackLogLine(playerName: string): string {
        return `${playerName} attaque:`;
    }

    private buildDefenseLogLine(playerName: string): string {
        return `${playerName} défense:`;
    }

    private buildStatBreakdownLine(data: StatBreakdownData): string {
        const signedDiceBonus = this.formatSignedValue(data.diceBonus);
        const signedPostureBonus = this.formatSignedValue(data.postureBonus);
        const signedSanctuaryBonus = this.formatSignedValue(data.sanctuaryBonus);
        const signedIceMalus = this.formatSignedValue(data.iceMalus);
        return [
            `Base=${data.base}`,
            `dé=${signedDiceBonus}`,
            `posture=${signedPostureBonus}`,
            `sanctuaire=${signedSanctuaryBonus}`,
            `glace=${signedIceMalus}`,
            `total=${data.total}`,
        ].join(' ');
    }

    private buildDifferenceLine(attackTotal: number, defenseTotal: number, difference: number): string {
        return `Différence ${attackTotal}-${defenseTotal}=${difference}`;
    }

    private buildDamageLine(damage: number): string {
        return `Dégâts ${damage}`;
    }

    private buildCombatExchangeMessage(data: CombatExchangeLogData): string {
        const { attackingPlayerName, defendingPlayerName, attackData, defenseData, comparison } = data;
        return [
            `--${attackingPlayerName} attaque ${defendingPlayerName}--`,
            this.buildAttackLogLine(attackingPlayerName),
            this.buildStatBreakdownLine(attackData),
            '',
            this.buildDefenseLogLine(defendingPlayerName),
            this.buildStatBreakdownLine(defenseData),
            '',
            this.buildDifferenceLine(comparison.attackTotal, comparison.defenseTotal, comparison.difference),
            this.buildDamageLine(comparison.damage),
        ].join('\n');
    }

    private formatSignedValue(value: number): string {
        return value >= 0 ? `+${value}` : `${value}`;
    }
}
