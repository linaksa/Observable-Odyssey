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
    formValid: boolean = false;
    formErrors: string[];
    isSubmitting: boolean = false;

    customHtml2Canvas = html2canvas;

    availableGameModes: GameType[] = [GameType.Classic, GameType.Ctf];
    availableGameModeLabels = {
        [GameType.Classic]: 'Classique',
        [GameType.Ctf]: 'Capture de drapeau',
    };

    constructor(private formBuilder: FormBuilder) {
        this.form = this.formBuilder.group({
            gameTitle: [''],
            description: [''],
            gameMode: [GameType.Classic],
        });
    }

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
            const canvas: HTMLCanvasElement = await this.customHtml2Canvas(grid);
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

        let observable;
        if (id) {
            observable = this.gameService.saveGame(id, gameData);
        } else {
            observable = this.gameService.createGame(gameData);
        }

        observable.subscribe({
            next: () => {
                this.formValid = true;
                this.isSubmitting = false;
            },
            error: (err) => {
                err = JSON.parse(err.error);
                this.formValid = false;
                this.formErrors = ['Une erreur est survenue lors de la sauvegarde du jeu.', err.error.error];
                this.isSubmitting = false;
            },
        });
    }
}
