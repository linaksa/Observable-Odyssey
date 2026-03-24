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
