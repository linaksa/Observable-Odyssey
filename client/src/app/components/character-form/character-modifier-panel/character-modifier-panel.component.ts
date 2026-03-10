import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { BonusSelectorComponent } from '@app/components/character-form/bonus-selector/bonus-selector.component';
import { DiceSelectorComponent } from '@app/components/character-form/dice-selector/dice-selector.component';
import { FormActionsComponent } from '@app/components/character-form/form-actions/form-actions.component';

@Component({
    selector: 'app-character-modifier-panel',
    imports: [CommonModule, BonusSelectorComponent, DiceSelectorComponent, FormActionsComponent],
    templateUrl: './character-modifier-panel.component.html',
})
export class CharacterModifierPanelComponent {
    @Input() form: FormGroup;
    @Output() formSubmitted = new EventEmitter<void>();

    submitForm(): void {
        this.formSubmitted.emit();
    }
}
