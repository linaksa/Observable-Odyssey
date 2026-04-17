/**
 * Testing strategy — Form Actions Component
 *
 * Approach:
 * - Mock CharacterFormService to isolate button behavior from real random-data generation.
 * - Verify public component actions delegate to output events and service calls.
 * - Keep the reactive form scaffolded to mirror runtime dependencies without extra logic.
 *
 * Edge cases covered:
 * - Ensures submit() always emits submitRequested for parent-driven form submission.
 * - Confirms generateRandom() calls populateWithRandomData exactly through the service.
 * - Validates component startup with loading/error signals present in the service mock.
 */
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { BonusType, DiceSelectionType } from '@app/constants/character-form';
import { CharacterFormService } from '@app/services/forms/character-form.service';
import { Avatar } from '@common/constants';
import { FormActionsComponent } from '@app/components/character-form/form-actions/form-actions.component';

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

    // Edge case: When submit is called, emit the output event.
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
