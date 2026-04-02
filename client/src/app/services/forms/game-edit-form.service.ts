import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CellType, IBoard } from '@common/board';
import { ErrorCode } from '@common/error-codes';
import { EditGameFormData, GameType } from '@common/game';

import { GameService } from '@app/services/admin/game.service';
import { extractErrorCodes, mapErrorCodesToMessage } from '@app/utils/error-codes';
import { IItem } from '@common/items';

const UNKNOWN_SAVE_ERROR_MESSAGE = 'Erreur inconnue, veuillez réessayer plus tard';
const ERRORS_ALREADY_SHOWN_ELSEWHERE = new Set<ErrorCode>([
    ErrorCode.GameTitleMissing,
    ErrorCode.GameTitleTooLong,
    ErrorCode.GameDescriptionMissing,
    ErrorCode.GameDescriptionTooLong,
    ErrorCode.BoardInvalidDoorPlacement,
    ErrorCode.BoardInaccessibleCells,
    ErrorCode.BoardInvalidSpawnCount,
    ErrorCode.BoardMissingFlag,
]);

@Injectable({
    providedIn: 'root',
})
export class GameEditFormService {
    private readonly gameService = inject(GameService);
    private readonly formBuilder = inject(FormBuilder);

    form: FormGroup = this.formBuilder.group({
        gameTitle: [''],
        description: [''],
    });
    readonly validationErrorCodes: WritableSignal<readonly ErrorCode[]> = signal<readonly ErrorCode[]>([]);
    formValid: boolean = false;
    readonly formErrors: WritableSignal<readonly string[]> = signal<readonly string[]>([]);
    isSubmitting: WritableSignal<boolean> = signal(false);

    init(gameData: EditGameFormData): void {
        this.form.patchValue({
            gameTitle: gameData.gameTitle,
            description: gameData.description,
        });
        this.resetValidationState();
        this.formValid = true;
    }

    resetForm(gameData: EditGameFormData): void {
        this.form.reset({
            gameTitle: gameData.gameTitle,
            description: gameData.description,
        });
        this.resetValidationState();
        this.formValid = true;
    }

    async submitForm(id: string, gameMode: GameType, cells: CellType[][], items: IItem[]): Promise<void> {
        this.isSubmitting.set(true);
        this.formErrors.set([]);

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
                    this.resetValidationState();
                    this.isSubmitting.set(false);
                    resolve();
                },
                error: (err) => {
                    this.formValid = false;
                    const errorCodes = extractErrorCodes(err);
                    this.validationErrorCodes.set(errorCodes ?? []);

                    if (!errorCodes || errorCodes.length === 0) {
                        this.formErrors.set([UNKNOWN_SAVE_ERROR_MESSAGE]);
                        this.isSubmitting.set(false);
                        reject();
                        return;
                    }

                    const unsurfacedCodes = errorCodes.filter((errorCode) => !ERRORS_ALREADY_SHOWN_ELSEWHERE.has(errorCode));
                    const serverErrors = mapErrorCodesToMessage(unsurfacedCodes, '');
                    this.formErrors.set(serverErrors.length > 0 ? serverErrors.split('\n') : []);
                    this.isSubmitting.set(false);
                    reject();
                },
            });
        });
    }

    private resetValidationState(): void {
        this.validationErrorCodes.set([]);
        this.formErrors.set([]);
    }
}
