/**
 * Testing strategy — Edition Game Form Component
 *
 * Approach:
 * - Render the reactive form with a lightweight GameEditFormService stub.
 * - Verify the template reflects the form values, errors, and loading state.
 * - Exercise submit and revert actions through the actual DOM bindings.
 *
 * Edge cases covered:
 * - Invalid form state should render every error message.
 * - The submit button should disable and show the loading icon while submitting.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from '@common/constants';
import { GameEditFormService } from '@app/services/forms/game-edit-form.service';
import { EditionGameFormComponent } from './edition-game-form.component';

describe('EditionGameFormComponent', () => {
    let component: EditionGameFormComponent;
    let fixture: ComponentFixture<EditionGameFormComponent>;
    let gameEditFormServiceStub: GameEditFormService;

    beforeEach(async () => {
        gameEditFormServiceStub = {
            form: new FormBuilder().group({
                gameTitle: ['Initial title'],
                description: ['Initial description'],
            }) as FormGroup,
            formErrors: [],
            formValid: true,
            isSubmitting: signal(false),
        } as unknown as GameEditFormService;

        await TestBed.configureTestingModule({
            imports: [EditionGameFormComponent],
            providers: [{ provide: GameEditFormService, useValue: gameEditFormServiceStub }],
        }).compileComponents();

        fixture = TestBed.createComponent(EditionGameFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should render form values, errors, and loading state from the service', () => {
        gameEditFormServiceStub.form.patchValue({
            gameTitle: 'Updated title',
            description: 'Updated description',
        });
        gameEditFormServiceStub.formValid = false;
        gameEditFormServiceStub.formErrors = ['Erreur 1', 'Erreur 2'];
        gameEditFormServiceStub.isSubmitting.set(true);
        fixture.detectChanges();

        expect((fixture.nativeElement.querySelector('#gameTitle') as HTMLInputElement).value).toBe('Updated title');
        expect((fixture.nativeElement.querySelector('#description') as HTMLTextAreaElement).value).toBe('Updated description');
        expect(fixture.nativeElement.querySelectorAll('.text-red-600').length).toBe(2);
        expect(fixture.nativeElement.querySelector('img[alt="Chargement"]')).toBeTruthy();
        expect((fixture.nativeElement.querySelector('button.btn-green') as HTMLButtonElement).disabled).toBeTrue();
    });

    it('should bind the shared title and description length limits', () => {
        const titleInput = fixture.nativeElement.querySelector('#gameTitle') as HTMLInputElement;
        const descriptionInput = fixture.nativeElement.querySelector('#description') as HTMLTextAreaElement;

        expect(titleInput.getAttribute('maxlength')).toBe(String(MAX_TITLE_LENGTH));
        expect(descriptionInput.getAttribute('maxlength')).toBe(String(MAX_DESCRIPTION_LENGTH));
    });

    it('should emit submitRequested when the form is submitted or confirmed', () => {
        const submitSpy = jasmine.createSpy('submitRequested');
        component.submitRequested.subscribe(submitSpy);

        const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
        const submitButton = fixture.nativeElement.querySelector('button.btn-green') as HTMLButtonElement;

        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        expect(submitSpy).toHaveBeenCalledTimes(1);

        submitSpy.calls.reset();
        submitButton.click();

        expect(submitSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit revertRequested when the revert button is clicked', () => {
        const revertSpy = jasmine.createSpy('revertRequested');
        component.revertRequested.subscribe(revertSpy);

        (fixture.nativeElement.querySelector('button.btn-red') as HTMLButtonElement).click();

        expect(revertSpy).toHaveBeenCalledTimes(1);
    });
});
