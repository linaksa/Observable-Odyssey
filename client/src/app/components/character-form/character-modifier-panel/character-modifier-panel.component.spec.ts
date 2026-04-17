/**
 * Testing strategy — Character Modifier Panel Component
 *
 * Approach:
 * - Isolate the panel by mocking bonus, dice, and form-action child components.
 * - Provide an explicit empty FormGroup input to satisfy the panel contract.
 * - Focus assertions on the submitForm output event emitted by the container.
 *
 * Edge cases covered:
 * - Ensures submitForm delegates to formSubmitted.emit without child interaction.
 * - Verifies output emission works even when the bound form has no controls.
 * - Confirms standalone override wiring does not break component creation.
 */
import { Component, Input } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { CharacterModifierPanelComponent } from '@app/components/character-form/character-modifier-panel/character-modifier-panel.component';

@Component({
    selector: 'app-bonus-selector',
    standalone: true,
    template: '',
})
class MockBonusSelectorComponent {
    @Input() form: FormGroup;
}

@Component({
    selector: 'app-dice-selector',
    template: '',
    standalone: true,
    inputs: ['form'],
})
class MockDiceSelectorComponent {}

@Component({
    selector: 'app-form-actions',
    template: '',
    standalone: true,
})
class MockFormActionsComponent {}

describe('CharacterModifierPanelComponent', () => {
    let component: CharacterModifierPanelComponent;
    let fixture: ComponentFixture<CharacterModifierPanelComponent>;

    beforeEach(async () => {
        const overrideInfo: MetadataOverride<Component> = {
            set: { imports: [MockBonusSelectorComponent, MockDiceSelectorComponent, MockFormActionsComponent] },
        };
        TestBed.overrideComponent(CharacterModifierPanelComponent, overrideInfo);

        await TestBed.configureTestingModule({
            imports: [CharacterModifierPanelComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(CharacterModifierPanelComponent);
        component = fixture.componentInstance;

        component.form = new FormGroup({});
        fixture.detectChanges();
    });

    // Edge case: When the form is submitted, emit formSubmitted output.
    it('should emit formSubmitted output when the form is submitted', () => {
        // Nominal case
        // The component calls the Output passed to it when its submitForm method is called.

        spyOn(component.formSubmitted, 'emit');
        component.submitForm();
        expect(component.formSubmitted.emit).toHaveBeenCalled();
    });
});
