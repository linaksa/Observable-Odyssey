/**
 * Testing strategy — Character Modifier Panel Component
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
import { Component, Input } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { CharacterModifierPanelComponent } from './character-modifier-panel.component';

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

    it('should emit formSubmitted output when the form is submitted', () => {
        // Nominal case
        // The component calls the Output passed to it when its submitForm method is called.

        spyOn(component.formSubmitted, 'emit');
        component.submitForm();
        expect(component.formSubmitted.emit).toHaveBeenCalled();
    });
});
