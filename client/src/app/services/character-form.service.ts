import { Injectable, WritableSignal, signal } from '@angular/core';
import { BonusType } from '@app/classes/character/character.model';

type DiceSelectionType = 'attack' | 'defense';
type CharacterFormValue = {
    playerName: string;
    avatarIndex: number | null;
    bonusType: BonusType | null;
    diceType: DiceSelectionType | null;
};

@Injectable({
    providedIn: 'root',
})
export class CharacterFormService {
    isSubmitting: WritableSignal<boolean> = signal(false);

    init(): void {
        // No-op for now; kept for future use
    }

    async submitForm(formValue: CharacterFormValue): Promise<void> {
        this.isSubmitting.set(true);

        // sauvegarder le form qqpart -> on utilise console log juste pour utiliser characterData avant sprint2
        // eslint-disable-next-line no-console
        console.log('Submitting character form', formValue);

        const timeout = 1000;
        return new Promise((resolve) => {
            setTimeout(() => {
                this.isSubmitting.set(false);
                resolve();
            }, timeout);
        });
    }
}
