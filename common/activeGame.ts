import { ICharacter } from "./character";
import { IGame } from "./game";
import { IItem } from "./items";

export interface IActiveGame {
    game: IGame;
    players: ICharacter[];
    itemsState: IItem[];
}