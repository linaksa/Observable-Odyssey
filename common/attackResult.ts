import { IActiveGame } from './activeGame';

export enum AttackPosture {
    Offensive = 'Offensive',
    Defensive = 'Defensive',
}

export interface CombatOutcome {
    updatedActiveGame: IActiveGame;
    winner: string | null;
    losers: string[];
}
