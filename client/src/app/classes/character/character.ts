export type Dice = 'D4' | 'D6';

export type BonusType = 'life' | 'speed';

export class Character {
    life: number = 6;
    speed: number = 6;
    attack: number = 4;
    defense: number = 4;

    attackDice: Dice = 'D4';
    defenseDice: Dice = 'D4';

    addBonus(type: BonusType, amount: number): void {
        if (type === 'life') {
            this.life += amount;
            return;
        }
        this.speed += amount;
    }

    removeBonus(type: BonusType, amount: number): void {
        if (type === 'life') {
            this.life -= amount;
            return;
        }
        this.speed -= amount;
    }
}

