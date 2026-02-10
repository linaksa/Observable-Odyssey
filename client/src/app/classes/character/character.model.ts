import { ICharacter } from '@common/ICharacter';
import { Avatar, DiceType } from '@common/constants';

export type BonusType = 'life' | 'speed';
export type DiceSelectionType = 'attack' | 'defense';

export class CharacterModel {
    static createDefault(avatar: Avatar): CharacterModel {
        return new CharacterModel({
            name: '',
            avatar,
            initialHealth: 6,
            currentHealth: 6,
            attackBonusDiceType: DiceType.FourSided,
            defenseBonusDiceType: DiceType.FourSided,
            rapidityPoints: 6,
            attackPoints: 4,
            defensePoints: 4,
            actionsLeft: 1,
            movementLeft: 6,
            x: 0,
            y: 0,
        });
    }

    constructor(private readonly character: ICharacter) {}

    get name(): string {
        return this.character.name;
    }
    set name(value: string) {
        this.character.name = value;
    }

    get avatar(): ICharacter['avatar'] {
        return this.character.avatar;
    }
    set avatar(value: ICharacter['avatar']) {
        this.character.avatar = value;
    }

    get initialHealth(): number {
        return this.character.initialHealth;
    }
    set initialHealth(value: number) {
        this.character.initialHealth = value;
    }

    get currentHealth(): number {
        return this.character.currentHealth;
    }
    set currentHealth(value: number) {
        this.character.currentHealth = value;
    }

    get attackBonusDiceType(): ICharacter['attackBonusDiceType'] {
        return this.character.attackBonusDiceType;
    }
    set attackBonusDiceType(value: ICharacter['attackBonusDiceType']) {
        this.character.attackBonusDiceType = value;
    }

    get defenseBonusDiceType(): ICharacter['defenseBonusDiceType'] {
        return this.character.defenseBonusDiceType;
    }
    set defenseBonusDiceType(value: ICharacter['defenseBonusDiceType']) {
        this.character.defenseBonusDiceType = value;
    }

    get rapidityPoints(): number {
        return this.character.rapidityPoints;
    }
    set rapidityPoints(value: number) {
        this.character.rapidityPoints = value;
    }

    get attackPoints(): number {
        return this.character.attackPoints;
    }
    set attackPoints(value: number) {
        this.character.attackPoints = value;
    }

    get defensePoints(): number {
        return this.character.defensePoints;
    }
    set defensePoints(value: number) {
        this.character.defensePoints = value;
    }

    get actionsLeft(): number {
        return this.character.actionsLeft;
    }
    set actionsLeft(value: number) {
        this.character.actionsLeft = value;
    }

    get movementLeft(): number {
        return this.character.movementLeft;
    }
    set movementLeft(value: number) {
        this.character.movementLeft = value;
    }

    get x(): number {
        return this.character.x;
    }
    set x(value: number) {
        this.character.x = value;
    }

    get y(): number {
        return this.character.y;
    }
    set y(value: number) {
        this.character.y = value;
    }

    addBonus(type: BonusType, amount: number): void {
        if (type === 'life') {
            this.character.initialHealth += amount;
            this.character.currentHealth += amount;
            return;
        }
        this.character.rapidityPoints += amount;
    }

    removeBonus(type: BonusType, amount: number): void {
        if (type === 'life') {
            this.character.initialHealth -= amount;
            this.character.currentHealth -= amount;
            return;
        }
        this.character.rapidityPoints -= amount;
    }

    applyBonusSelection(previous: BonusType | null, next: BonusType | null, amount: number): void {
        if (previous) {
            this.removeBonus(previous, amount);
        }
        if (next) {
            this.addBonus(next, amount);
        }
    }

    applyDiceChoice(choice: DiceSelectionType | null): void {
        if (choice === 'attack') {
            this.character.attackBonusDiceType = DiceType.SixSided;
            this.character.defenseBonusDiceType = DiceType.FourSided;
            return;
        }

        if (choice === 'defense') {
            this.character.attackBonusDiceType = DiceType.FourSided;
            this.character.defenseBonusDiceType = DiceType.SixSided;
            return;
        }

        this.character.attackBonusDiceType = DiceType.FourSided;
        this.character.defenseBonusDiceType = DiceType.FourSided;
    }
}
