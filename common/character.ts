import { Avatar, DiceType } from './constants';

export interface Position {
    x: number;
    y: number;
}

export enum Team {
    RED = 'red',
    BLUE = 'blue',
}
export enum VirtualPlayerProfile {
    Agressive = 'agressif',
    Defensive = 'defensive',
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
    virtualPlayerProfile?: VirtualPlayerProfile;
    fightSanctuaryUsed?: boolean;
    fightSanctuaryTurnsRemaining?: number;
    fightSanctuaryBonus?: number;

    // The following properties record stats about the character
    nCombats: number;
    nVictories: number;
    nDefeats: number;
    totalDamageDealt: number;
    totalDamageReceived: number;
    visitedCells: string[]; // list of "x,y" strings representing visited cells;
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
    virtualPlayerProfile?: VirtualPlayerProfile;
}
