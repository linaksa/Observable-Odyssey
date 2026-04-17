/**
 * Testing strategy — Editor Game Form Component
 *
 * Approach:
 * - Inject a deterministic form + validation signal service stub.
 * - Validate title/description error states and generated messages across all branches.
 *
 * Edge cases covered:
 * - Whitespace-only values should trigger missing-field errors.
 * - Over-limit values should trigger max-length errors.
 * - Unknown/non-string values should be handled safely.
 */
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { GameEditFormService } from '@app/services/forms/game-edit-form.service';
import { getErrorMessage } from '@app/utils/error-codes';
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from '@common/constants';
import { ErrorCode } from '@common/error-codes';
import { EditorGameFormComponent } from './editor-game-form.component';

const NON_STRING_VALUE = 123;

describe('EditorGameFormComponent', () => {
    let component: EditorGameFormComponent;
    let fixture: ComponentFixture<EditorGameFormComponent>;
    let gameEditFormServiceStub: {
        form: ReturnType<FormBuilder['group']>;
        validationErrorCodes: ReturnType<typeof signal<readonly ErrorCode[]>>;
    };

    beforeEach(async () => {
        const fb = new FormBuilder();
        gameEditFormServiceStub = {
            form: fb.group({
                gameTitle: [''],
                description: [''],
            }),
            validationErrorCodes: signal<readonly ErrorCode[]>([]),
        };

        TestBed.overrideComponent(EditorGameFormComponent, { set: { template: '' } });

        await TestBed.configureTestingModule({
            imports: [EditorGameFormComponent],
            providers: [{ provide: GameEditFormService, useValue: gameEditFormServiceStub }],
        }).compileComponents();

        fixture = TestBed.createComponent(EditorGameFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should return no errors when validation codes are absent', () => {
        gameEditFormServiceStub.form.get('gameTitle')?.setValue('Title');
        gameEditFormServiceStub.form.get('description')?.setValue('Description');
        gameEditFormServiceStub.validationErrorCodes.set([]);

        expect((component as unknown as { titleHasError: () => boolean }).titleHasError()).toBeFalse();
        expect((component as unknown as { descriptionHasError: () => boolean }).descriptionHasError()).toBeFalse();
        expect((component as unknown as { titleErrorMessage: () => string }).titleErrorMessage()).toBe('');
        expect((component as unknown as { descriptionErrorMessage: () => string }).descriptionErrorMessage()).toBe('');
    });

    it('should detect and describe missing title/description values', () => {
        // Nominal case: whitespace inputs are treated as empty.
        gameEditFormServiceStub.form.get('gameTitle')?.setValue('   ');
        gameEditFormServiceStub.form.get('description')?.setValue('');
        gameEditFormServiceStub.validationErrorCodes.set([ErrorCode.GameTitleMissing, ErrorCode.GameDescriptionMissing]);

        expect((component as unknown as { titleHasError: () => boolean }).titleHasError()).toBeTrue();
        expect((component as unknown as { descriptionHasError: () => boolean }).descriptionHasError()).toBeTrue();
        expect((component as unknown as { titleErrorMessage: () => string }).titleErrorMessage()).toBe(getErrorMessage(ErrorCode.GameTitleMissing));
        expect((component as unknown as { descriptionErrorMessage: () => string }).descriptionErrorMessage()).toBe(
            getErrorMessage(ErrorCode.GameDescriptionMissing),
        );
    });

    it('should detect and describe title/description max-length errors', () => {
        gameEditFormServiceStub.form.get('gameTitle')?.setValue('a'.repeat(MAX_TITLE_LENGTH + 1));
        gameEditFormServiceStub.form.get('description')?.setValue('b'.repeat(MAX_DESCRIPTION_LENGTH + 1));
        gameEditFormServiceStub.validationErrorCodes.set([ErrorCode.GameTitleTooLong, ErrorCode.GameDescriptionTooLong]);

        expect((component as unknown as { titleHasError: () => boolean }).titleHasError()).toBeTrue();
        expect((component as unknown as { descriptionHasError: () => boolean }).descriptionHasError()).toBeTrue();
        expect((component as unknown as { titleErrorMessage: () => string }).titleErrorMessage()).toBe(getErrorMessage(ErrorCode.GameTitleTooLong));
        expect((component as unknown as { descriptionErrorMessage: () => string }).descriptionErrorMessage()).toBe(
            getErrorMessage(ErrorCode.GameDescriptionTooLong),
        );
    });

    it('should safely handle non-string values in private validation helpers', () => {
        gameEditFormServiceStub.validationErrorCodes.set([ErrorCode.GameTitleMissing]);

        // Edge case: unknown value type should not crash and should use empty fallback.
        expect(
            (
                component as unknown as {
                    hasValidationError: (value: unknown, missing: ErrorCode, tooLong: ErrorCode, maxLength: number) => boolean;
                }
            ).hasValidationError(NON_STRING_VALUE, ErrorCode.GameTitleMissing, ErrorCode.GameTitleTooLong, MAX_TITLE_LENGTH),
        ).toBeTrue();

        expect(
            (
                component as unknown as {
                    getFieldErrorMessage: (value: unknown, missing: ErrorCode, tooLong: ErrorCode, maxLength: number) => string;
                }
            ).getFieldErrorMessage(NON_STRING_VALUE, ErrorCode.GameTitleMissing, ErrorCode.GameTitleTooLong, MAX_TITLE_LENGTH),
        ).toBe(getErrorMessage(ErrorCode.GameTitleMissing));
    });
});
