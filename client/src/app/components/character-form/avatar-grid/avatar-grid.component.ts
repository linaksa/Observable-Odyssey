import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { AVATAR_IMAGE_PATH_MODEL } from '@app/constants/character-form';
import { Avatar } from '@common/constants';

@Component({
    selector: 'app-avatar-grid',
    imports: [CommonModule],
    templateUrl: './avatar-grid.component.html',
})
export class AvatarGridComponent {
    @Input() form: FormGroup;
    @Input() unavailableAvatars: Avatar[] = [];

    availableAvatars: Avatar[] = [
        Avatar.Avatar1,
        Avatar.Avatar2,
        Avatar.Avatar3,
        Avatar.Avatar4,
        Avatar.Avatar5,
        Avatar.Avatar6,
        Avatar.Avatar7,
        Avatar.Avatar8,
        Avatar.Avatar9,
        Avatar.Avatar10,
        Avatar.Avatar11,
        Avatar.Avatar12,
    ];

    selectAvatar(avatar: Avatar): void {
        if (this.unavailableAvatars.includes(avatar)) return;

        this.form.patchValue({ avatar });
    }

    get selectedAvatar(): Avatar | null {
        return this.form.controls.avatar.value;
    }

    getImageForAvatar(avatar: Avatar): string {
        return AVATAR_IMAGE_PATH_MODEL.replace('{}', avatar);
    }
}
