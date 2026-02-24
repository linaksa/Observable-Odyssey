import { Avatar, DiceType } from './constants';

export enum CharacterStatus{
    IN_GAME = 'in_game',
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
    wonCombatCount: number;
    hasAbandoned: boolean;
    x: number;
    y: number;
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
