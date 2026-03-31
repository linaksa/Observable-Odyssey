import { IActiveGame } from './activeGame';

export interface AttackResult {
    attackerName: string;
    defenderName: string;
    attackerVictories: number;
    attackerActionsLeft: number;
    defenderNewPosition: { x: number; y: number };
}

export enum AttackPosture {
    Offensive = 'Offensive',
    Defensive = 'Defensive',
}

export interface CombatOutcome {
    updatedActiveGame: IActiveGame;
    winner: string | null;
    losers: string[];
}

export interface CombatTurnOutcome {
    updatedActiveGame: IActiveGame;

    attackerStats: AttackStats;
    defenderStats: AttackStats;

    attackerReceivedDamage: number;
    defenderReceivedDamage: number;
}

export interface AttackStats {
    baseAttackPoints: number;
    baseDefensePoints: number;

    attackDiceBonus: number;
    defenseDiceBonus: number;

    postureAttackBonus: number;
    postureDefenseBonus: number;

    attackIceMalus: number;
    defenseIceMalus: number;

    totalAttackPoints: number;
    totalDefensePoints: number;
}
