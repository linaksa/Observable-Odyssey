import { CharacterModel } from '@app/classes/character/character.model';
import { Avatar } from '@common/constants';

export interface AvatarI {
    name: string;
    avatar: Avatar;
    image: string;
    character: CharacterModel;
}
