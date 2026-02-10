import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CellType, IBoard } from '@common/board';
import { EditGameFormData, GameType } from '@common/game';

import { IItem } from '@common/items';
import html2canvas from 'html2canvas-oklch';
import { GameService } from './game.service';

@Injectable({
    providedIn: 'root',
})
export class GameEditFormService {
    gameService = inject(GameService);

    form: FormGroup;
    formValid: boolean = false;
    formErrors: string[];
    isSubmitting: WritableSignal<boolean> = signal(false);

    customHtml2Canvas = html2canvas;

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

    async getPreviewImage(gridSelector: HTMLElement | null): Promise<Base64URLString | null> {
        if (!gridSelector) {
            return null;
        }

        let imgData: Base64URLString;
        try {
            const canvas: HTMLCanvasElement = await this.customHtml2Canvas(gridSelector);
            imgData = canvas.toDataURL('image/png');
        } catch {
            return null;
        }
        return imgData;
    }


    async submitForm(id: string, gameMode:GameType, cells: CellType[][], items: IItem[], gridSelector: HTMLElement | null): Promise<void> {
        this.isSubmitting.set(true);
        // Allow angular to rerender before html2canva blocks the cycle somehow
        await new Promise(resolve => setTimeout(resolve, 0));
        this.formErrors = [];

        const previewImage = await this.getPreviewImage(gridSelector);
        if (!previewImage) {
            this.formValid = false;
            this.formErrors = ['Une erreur est survenue lors de la génération de l\'aperçu du plateau.'];
            this.isSubmitting.set(false);
            return Promise.reject();
        }

        const formData = this.form.value;
        const board: IBoard = {
            cells,
            items,
        };

        const gameData: EditGameFormData = {
            gameTitle: formData.gameTitle,
            description: formData.description,
            gameMode,
            preview: previewImage,
            board,
        };

        let observable;
        if (id) {
            observable = this.gameService.saveGame(id, gameData);
        } else {
            observable = this.gameService.createGame(gameData);
        }

        return new Promise(
            (resolve, reject) => {
                observable.subscribe({
                    next: () => {
                        this.formValid = true;
                        this.isSubmitting.set(false);
                        resolve();
                    },
                    error: (err) => {
                        err = JSON.parse(err.error);
                        this.formValid = false;
                        this.formErrors = ['Une erreur est survenue lors de la sauvegarde du jeu.', err.error];
                        this.isSubmitting.set(false);
                        reject();
                    },
                });
            },
        );
    }
}
