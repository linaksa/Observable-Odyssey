import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { AvatarGridComponent } from '@app/components/character-form/avatar-grid/avatar-grid.component';
import { AvatarPreviewComponent } from '@app/components/character-form/avatar-preview/avatar-preview.component';
import { Avatar } from '@common/constants';

@Component({
    selector: 'app-avatar-selector',
    imports: [CommonModule, AvatarPreviewComponent, AvatarGridComponent],
    templateUrl: './avatar-selector.component.html',
})
export class AvatarSelectorComponent {
    @Input() form: FormGroup;
    @Input() unavailableAvatars: Avatar[] = [];

    get selectedAvatar(): Avatar | null {
        return this.form.controls.avatar.value;
    }
}
