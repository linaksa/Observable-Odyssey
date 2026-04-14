import { IActiveGame } from '@common/active-game';
import { ICharacter } from '@common/character';

export interface VirtualPlayer {
    play(character: ICharacter, game: IActiveGame): void;
}
