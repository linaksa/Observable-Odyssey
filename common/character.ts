import { Avatar, DiceType } from './constants';

export interface Position {
    x: number;
    y: number;
}

export enum Team {
    RED = 'red',
    BLUE = 'blue',
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
    actionsLeft: number;
    movementLeft: number;
    victories: number;
    hasAbandoned: boolean;
    positionDepart: Position;
    positionGrille: Position;
    team?: Team | null;
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
