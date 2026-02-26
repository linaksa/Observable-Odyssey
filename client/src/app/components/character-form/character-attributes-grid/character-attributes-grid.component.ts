import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AttributeDisplayComponent } from '@app/components/character-form/attribute-display/attribute-display.component';
import { CharacterFormService } from '@app/services/character-form.service';

@Component({
    selector: 'app-character-attributes-grid',
    imports: [CommonModule, AttributeDisplayComponent],
    templateUrl: './character-attributes-grid.component.html',
})
export class CharacterAttributesGridComponent {
    characterFormService = inject(CharacterFormService);
}
