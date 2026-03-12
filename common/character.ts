import { Avatar, DiceType } from './constants';

export interface Position {
    x: number;
    y: number;
}
export interface ICharacter {
    name: string;
    avatar: Avatar;
    initialHealth: number;
    currentHealth: number;
    attackBonusDiceType: DiceType;
    defenseBonusDiceType: DiceType;
    rapidityPoints: number;
    attackPoints: number;
    defensePoints: number;
    actionsLeft: number; // to review, may not be necessary
    movementLeft: number;
    victories: number;
    hasAbandoned: boolean;
    positionDepart: Position;
    positionGrille: Position;
}

export interface CharacterFormData {
    name: string;
    avatar: Avatar;
    initialHealth: number;
    attackBonusDiceType: DiceType;
    defenseBonusDiceType: DiceType;
    rapidityPoints: number;
    attackPoints: number;
    defensePoints: number;
}
