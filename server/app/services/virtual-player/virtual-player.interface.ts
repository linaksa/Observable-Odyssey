import { IActiveGame } from '@common/activeGame';
import { ICharacter } from '@common/character';

export interface VirtualPlayer {
    play(character: ICharacter, game: IActiveGame): void;
}
