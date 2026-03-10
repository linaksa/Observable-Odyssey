import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AVATAR_IMAGE_PATH_MODEL } from '@app/constants/character-form';
import { Avatar } from '@common/constants';

@Component({
    selector: 'app-avatar-preview',
    imports: [CommonModule],
    templateUrl: './avatar-preview.component.html',
})
export class AvatarPreviewComponent {
    @Input() avatar: Avatar | null = null;

    getImageForAvatar(avatar: Avatar): string {
        if(!avatar) {
            return '';
        }
        return AVATAR_IMAGE_PATH_MODEL.replace('{}', avatar);
    }
}
