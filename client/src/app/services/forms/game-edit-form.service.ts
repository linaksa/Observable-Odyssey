import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CellType, IBoard } from '@common/board';
import { EditGameFormData, GameType } from '@common/game';

import { IItem } from '@common/items';
import { GameService } from '@app/services/admin/game.service';

@Injectable({
    providedIn: 'root',
})
export class GameEditFormService {
    private readonly gameService = inject(GameService);

    form: FormGroup;
    formValid: boolean = false;
    formErrors: string[] = [];
    isSubmitting: WritableSignal<boolean> = signal(false);

    constructor(private formBuilder: FormBuilder) {
        this.form = this.formBuilder.group({
            gameTitle: [''],
            description: [''],
        });
    }

    init(gameData: EditGameFormData): void {
        this.form.patchValue({
            gameTitle: gameData.gameTitle,
            description: gameData.description,
        });
    }

    resetForm(gameData: EditGameFormData): void {
        this.form.reset({
            gameTitle: gameData.gameTitle,
            description: gameData.description,
        });
    }

    async submitForm(id: string, gameMode: GameType, cells: CellType[][], items: IItem[]): Promise<void> {
        this.isSubmitting.set(true);
        this.formErrors = [];

        const formData = this.form.value;
        const board: IBoard = {
            cells,
            items,
        };

        const gameData: EditGameFormData = {
            gameTitle: formData.gameTitle,
            description: formData.description,
            gameMode,
            board,
        };

        const observable = id ? this.gameService.saveGame(id, gameData) : this.gameService.createGame(gameData);

        return new Promise((resolve, reject) => {
            observable.subscribe({
                next: () => {
                    this.formValid = true;
                    this.isSubmitting.set(false);
                    resolve();
                },
                error: (err) => {
                    this.formValid = false;
                    const serverError = err.originalError?.error;

                    this.formErrors = ['Une erreur est survenue lors de la sauvegarde du jeu.', serverError?.error || 'Erreur inconnue'];
                    this.isSubmitting.set(false);
                    reject();
                },
            });
        });
    }
}
