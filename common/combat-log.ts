import { AttackPosture, AttackStats } from './attackResult';

export interface CombatTurnLogData {
    gameId: string;
    attackerName: string;
    defenderName: string;
    combatTurnNumber: number;
    attackerPosture: AttackPosture | null;
    defenderPosture: AttackPosture | null;
    attackerStats: AttackStats;
    defenderStats: AttackStats;
    attackerDealtDamage: number;
    defenderDealtDamage: number;
}

export interface StatBreakdownData {
    base: number;
    diceBonus: number;
    postureBonus: number;
    sanctuaryBonus: number;
    iceMalus: number;
    total: number;
}

export interface CombatExchangeLogData {
    attackingPlayerName: string;
    defendingPlayerName: string;
    attackData: StatBreakdownData;
    defenseData: StatBreakdownData;
    comparison: {
        attackTotal: number;
        defenseTotal: number;
        difference: number;
        damage: number;
    };
}

export const DEFENSE_SANCTUARY_BONUS = 0;
