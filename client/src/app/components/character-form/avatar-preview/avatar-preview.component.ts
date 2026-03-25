import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Avatar, buildAvatarAssetPath } from '@common/constants';

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
