import { IActiveGame } from '@common/activeGame';
import { Position } from '@common/character';

export interface CombatResult {
    attackerVictories: number;
    defenderNewPosition: Position;
    attackerActionsLeft: number;
}

export interface CombatOutcome {
    updatedActiveGame: IActiveGame;
    winner: string | null;
    losers: string[];
}
