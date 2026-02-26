import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AttributeDescriptionsComponent } from '@app/components/character-form/attribute-descriptions/attribute-descriptions.component';
import { CharacterAttributesGridComponent } from '@app/components/character-form/character-attributes-grid/character-attributes-grid.component';
import { PlayerNameInputComponent } from '@app/components/character-form/player-name-input/player-name-input.component';

@Component({
    selector: 'app-character-info-panel',
    imports: [CommonModule, ReactiveFormsModule, PlayerNameInputComponent, CharacterAttributesGridComponent, AttributeDescriptionsComponent],
    templateUrl: './character-info-panel.component.html',
})
export class CharacterInfoPanelComponent {
    @Input() form: FormGroup;
}
