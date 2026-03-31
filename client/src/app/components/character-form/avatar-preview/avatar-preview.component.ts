import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Avatar } from '@common/constants';
import { buildAvatarAssetPath } from '@app/utils/avatar-path';

@Component({
    selector: 'app-avatar-preview',
    imports: [CommonModule],
    templateUrl: './avatar-preview.component.html',
})
export class AvatarPreviewComponent {
    @Input() avatar: Avatar | null = null;

    getImageForAvatar(avatar: Avatar): string {
        return buildAvatarAssetPath(avatar);
    }
}
