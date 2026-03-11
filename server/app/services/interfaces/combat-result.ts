import { Position } from '@common/character';

export interface CombatResult {
    attackerVictories: number;
    defenderNewPosition: Position;
}
