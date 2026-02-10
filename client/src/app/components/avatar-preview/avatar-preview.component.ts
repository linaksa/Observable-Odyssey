import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AvatarI } from '@app/classes/character/AvatarI';

@Component({
    selector: 'app-avatar-preview',
    imports: [CommonModule],
    templateUrl: './avatar-preview.component.html',
})
export class AvatarPreviewComponent {
    @Input() avatars: AvatarI[] = [];
    @Input() selectedAvatarIndex: number | null = null;
}
