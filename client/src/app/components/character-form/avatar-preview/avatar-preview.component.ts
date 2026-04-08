import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { getImageForAvatar } from '@app/utils/avatar-path';
import { Avatar } from '@common/constants';

@Component({
    selector: 'app-avatar-preview',
    imports: [CommonModule],
    templateUrl: './avatar-preview.component.html',
})
export class AvatarPreviewComponent {
    @Input() avatar: Avatar | null = null;

    readonly getImageForAvatar = getImageForAvatar;
}
