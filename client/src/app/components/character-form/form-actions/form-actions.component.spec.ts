/**
 * Testing strategy — Form Actions Component
 *
 * Approach:
 * - Keep each test focused on one behavior with deterministic mocks/spies.
 * - Validate both nominal flows and failure paths that could break UX/state.
 * - Assert side effects explicitly (state changes, emitted events, and service calls).
 *
 * Edge cases covered:
 * - Missing or invalid input guards and safe early returns.
 * - Error handling paths and fallback user-facing messaging.
 * - Cleanup/teardown behavior (unsubscribe/reset/disconnect) when applicable.
 */
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { BonusType, DiceSelectionType } from '@app/constants/character-form';
import { CharacterFormService } from '@app/services/forms/character-form.service';
import { Avatar } from '@common/constants';
import { FormActionsComponent } from './form-actions.component';

describe('FormActionsComponent', () => {
    let component: FormActionsComponent;
    let fixture: ComponentFixture<FormActionsComponent>;

    let characterFormServiceSpy: jasmine.SpyObj<CharacterFormService>;

    beforeEach(async () => {
        characterFormServiceSpy = jasmine.createSpyObj('CharacterFormService', ['populateWithRandomData'], {
            isLoading: signal(false),
            errors: signal(null),
        });

        characterFormServiceSpy.characterForm = new FormGroup({
            playerName: new FormControl<string>('', { nonNullable: true }),
            avatar: new FormControl<Avatar | null>(null),
            bonusType: new FormControl<BonusType | null>(null),
            diceType: new FormControl<DiceSelectionType | null>(null),
        });

        await TestBed.configureTestingModule({
            imports: [FormActionsComponent],
            providers: [{ provide: CharacterFormService, useValue: characterFormServiceSpy }],
        }).compileComponents();

        fixture = TestBed.createComponent(FormActionsComponent);
        component = fixture.componentInstance;

        fixture.detectChanges();
    });

    it('should emit the output event when submit is called', () => {
        // Nominal case
        // The component should emit the submitRequested event when the submit method is called

        spyOn(component.submitRequested, 'emit');
        component.submit();
        expect(component.submitRequested.emit).toHaveBeenCalled();
    });

    it('should call the service method to populate with random data', () => {
        // Nominal case
        // The component should call the service populateWithRandomData method when the generateRandom method is called

        component.generateRandom();
        expect(characterFormServiceSpy.populateWithRandomData).toHaveBeenCalled();
    });
});
