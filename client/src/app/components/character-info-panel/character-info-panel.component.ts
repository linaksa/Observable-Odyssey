import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AvatarI } from '@app/classes/character/AvatarI';
import { AttributeDescriptionsComponent } from '@app/components/attribute-descriptions/attribute-descriptions.component';
import { CharacterAttributesGridComponent } from '@app/components/character-attributes-grid/character-attributes-grid.component';
import { PlayerNameInputComponent } from '@app/components/player-name-input/player-name-input.component';

@Component({
    selector: 'app-character-info-panel',
    imports: [CommonModule, ReactiveFormsModule, PlayerNameInputComponent, CharacterAttributesGridComponent, AttributeDescriptionsComponent],
    templateUrl: './character-info-panel.component.html',
})
export class CharacterInfoPanelComponent {
    @Input() form!: FormGroup;
    @Input() avatars: AvatarI[] = [];
    @Input() selectedAvatarIndex: number | null = null;
}
