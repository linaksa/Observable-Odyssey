import type { Position } from '@common/character';

export interface MovementStep {
    pos: Position;
    costSoFar: number;
}
