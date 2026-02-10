import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AvatarI } from '@app/classes/character/AvatarI';

@Component({
    selector: 'app-avatar-grid',
    imports: [CommonModule],
    templateUrl: './avatar-grid.component.html',
})
export class AvatarGridComponent {
    @Input() avatars: AvatarI[] = [];
    @Input() selectedAvatarIndex: number | null = null;
    @Output() avatarSelected = new EventEmitter<number>();

    selectAvatar(index: number): void {
        this.avatarSelected.emit(index);
    }
}
