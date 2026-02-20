import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AvatarI } from '@app/classes/character/AvatarI';
import { AttributeDisplayComponent } from '@app/components/character-form/attribute-display/attribute-display.component';

@Component({
    selector: 'app-character-attributes-grid',
    imports: [CommonModule, AttributeDisplayComponent],
    templateUrl: './character-attributes-grid.component.html',
})
export class CharacterAttributesGridComponent {
    @Input() avatars: AvatarI[] = [];
    @Input() selectedAvatarIndex: number | null = null;
}
