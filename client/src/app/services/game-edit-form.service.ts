import { inject, Injectable } from '@angular/core';
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
    formValid: boolean;
    formErrors: string[];
    isSubmitting: boolean = false;

    constructor(private formBuilder: FormBuilder) {
        this.form = this.formBuilder.group({
            gameTitle: [''],
            description: [''],
            gameMode: [GameType.Classic],
        });
    }

    availableGameModes: GameType[] = [GameType.Classic, GameType.Ctf];

    availableGameModeLabels = {
        [GameType.Classic]: 'Classique',
        [GameType.Ctf]: 'Capture de drapeau',
    };

    init(gameData: EditGameFormData): void {
        this.form.patchValue({
            gameTitle: gameData.gameTitle,
            description: gameData.description,
            gameMode: gameData.gameMode,
        });
    }

    async getPreviewImage(): Promise<Base64URLString | null> {
        const grid: HTMLElement | null = document.querySelector('#grid-container');
        if (!grid) {
            return null;
        }

        let imgData: Base64URLString;
        try {
            const canvas = await html2canvas(grid);
            imgData = canvas.toDataURL('image/png');
        } catch {
            return null;
        }
        return imgData;
    }

    async submitForm(id: string, cells: CellType[][], items: IItem[]): Promise<void> {
        this.isSubmitting = true;
        this.formErrors = [];

        const previewImage = await this.getPreviewImage();
        if (!previewImage) {
            this.formValid = false;
            this.formErrors = ["Une erreur est survenue lors de la génération de l'aperçu du plateau."];
            this.isSubmitting = false;
            return;
        }

        if (!this.form.valid) {
            this.formValid = false;
            this.formErrors = ['Le formulaire contient des erreurs. Veuillez vérifier les champs.'];
            this.isSubmitting = false;
            return;
        }

        const formData = this.form.value;
        const board: IBoard = {
            cells,
            items,
        };

        const gameData: EditGameFormData = {
            gameTitle: formData.gameTitle,
            description: formData.description,
            gameMode: formData.gameMode,
            preview: previewImage,
            board,
        };
        if (id) {
            this.gameService.saveGame(id, gameData).subscribe({
                next: () => {
                    this.formValid = true;
                    this.isSubmitting = false;
                },
                error: (err) => {
                    this.formValid = false;
                    this.formErrors = ['Une erreur est survenue lors de la sauvegarde du jeu.', err.error];
                    this.isSubmitting = false;
                },
            });
        } else {
            this.gameService.createGame(gameData).subscribe({
                next: () => {
                    this.formValid = true;
                    this.isSubmitting = false;
                },
                error: (err) => {
                    this.formValid = false;
                    this.formErrors = ['Une erreur est survenue lors de la création du jeu.', err.error];
                    this.isSubmitting = false;
                },
            });
        }
    }
}
