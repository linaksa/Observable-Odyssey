import { ICharacter } from '@common/character';

export interface ClosestPlayerResult {
    player: ICharacter;
    distance: number;
    bestAdjacentIndex: number;
}
