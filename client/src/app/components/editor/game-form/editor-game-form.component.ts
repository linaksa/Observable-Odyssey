import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { GameEditFormService } from '@app/services/forms/game-edit-form.service';
import { ErrorCode, getErrorMessage } from '@app/utils/error-codes';
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from '@common/constants';

@Component({
    selector: 'app-editor-game-form',
    imports: [ReactiveFormsModule],
    templateUrl: './editor-game-form.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'flex w-full flex-col min-h-0',
    },
})
export class EditorGameFormComponent {
    protected readonly gameEditFormService = inject(GameEditFormService);
    protected readonly maxTitleLength = MAX_TITLE_LENGTH;
    protected readonly maxDescriptionLength = MAX_DESCRIPTION_LENGTH;

    readonly submitRequested = output<void>();
    readonly revertRequested = output<void>();

    protected titleHasError(): boolean {
        return this.hasValidationError(
            this.gameEditFormService.form.get('gameTitle')?.value,
            ErrorCode.GameTitleMissing,
            ErrorCode.GameTitleTooLong,
            this.maxTitleLength,
        );
    }

    protected descriptionHasError(): boolean {
        return this.hasValidationError(
            this.gameEditFormService.form.get('description')?.value,
            ErrorCode.GameDescriptionMissing,
            ErrorCode.GameDescriptionTooLong,
            this.maxDescriptionLength,
        );
    }

    protected titleErrorMessage(): string {
        return this.getFieldErrorMessage(
            this.gameEditFormService.form.get('gameTitle')?.value,
            ErrorCode.GameTitleMissing,
            ErrorCode.GameTitleTooLong,
            this.maxTitleLength,
        );
    }

    protected descriptionErrorMessage(): string {
        return this.getFieldErrorMessage(
            this.gameEditFormService.form.get('description')?.value,
            ErrorCode.GameDescriptionMissing,
            ErrorCode.GameDescriptionTooLong,
            this.maxDescriptionLength,
        );
    }

    private hasValidationError(value: unknown, missingCode: ErrorCode, tooLongCode: ErrorCode, maxLength: number): boolean {
        const validationErrorCodes = this.gameEditFormService.validationErrorCodes();
        const text = typeof value === 'string' ? value.trim() : '';

        return (
            (validationErrorCodes.includes(missingCode) && text.length === 0) ||
            (validationErrorCodes.includes(tooLongCode) && text.length > maxLength)
        );
    }

    private getFieldErrorMessage(value: unknown, missingCode: ErrorCode, tooLongCode: ErrorCode, maxLength: number): string {
        const validationErrorCodes = this.gameEditFormService.validationErrorCodes();
        const text = typeof value === 'string' ? value.trim() : '';

        if (validationErrorCodes.includes(missingCode) && text.length === 0) {
            return getErrorMessage(missingCode);
        }

        if (validationErrorCodes.includes(tooLongCode) && text.length > maxLength) {
            return getErrorMessage(tooLongCode);
        }

        return '';
    }
}
