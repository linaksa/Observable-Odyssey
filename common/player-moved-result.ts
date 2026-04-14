import { Position } from './character';

export interface PlayerMovedResult {
    playerId: string;
    newPosition: Position;
    movementLeft: number;
}
