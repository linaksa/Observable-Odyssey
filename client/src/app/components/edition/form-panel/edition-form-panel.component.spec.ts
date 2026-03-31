/**
 * Testing strategy — Edition Form Panel Component
 *
 * Approach:
 * - Render the panel with a lightweight GameEditFormService stub.
 * - Verify the panel hosts the child form component and forwards its outputs.
 * - Keep the test focused on panel wiring rather than form validation logic.
 *
 * Edge cases covered:
 * - Submit and revert events should bubble through the panel unchanged.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { EditionGameFormComponent } from '@app/components/edition/game-form/edition-game-form.component';
import { GameEditFormService } from '@app/services/forms/game-edit-form.service';
import { EditionFormPanelComponent } from './edition-form-panel.component';

describe('EditionFormPanelComponent', () => {
    let component: EditionFormPanelComponent;
    let fixture: ComponentFixture<EditionFormPanelComponent>;
    let gameEditFormServiceStub: GameEditFormService;

    beforeEach(async () => {
        gameEditFormServiceStub = {
            form: new FormBuilder().group({
                gameTitle: ['Test game'],
                description: ['Test description'],
            }) as FormGroup,
            formErrors: [],
            formValid: true,
            isSubmitting: signal(false),
        } as unknown as GameEditFormService;

        await TestBed.configureTestingModule({
            imports: [EditionFormPanelComponent],
            providers: [{ provide: GameEditFormService, useValue: gameEditFormServiceStub }],
        }).compileComponents();

        fixture = TestBed.createComponent(EditionFormPanelComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should render the panel heading and child form component', () => {
        expect(fixture.nativeElement.textContent).toContain('Description');
        expect(fixture.debugElement.query(By.directive(EditionGameFormComponent))).toBeTruthy();
    });

    it('should forward submit and revert requests from the child form', () => {
        const submitSpy = jasmine.createSpy('submitRequested');
        const revertSpy = jasmine.createSpy('revertRequested');
        component.submitRequested.subscribe(submitSpy);
        component.revertRequested.subscribe(revertSpy);

        const child = fixture.debugElement.query(By.directive(EditionGameFormComponent)).componentInstance as EditionGameFormComponent;

        child.submitRequested.emit();
        child.revertRequested.emit();

        expect(submitSpy).toHaveBeenCalled();
        expect(revertSpy).toHaveBeenCalled();
    });
});
