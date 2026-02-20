import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AvatarI } from '@app/classes/character/AvatarI';
import { AvatarGridComponent } from '@app/components/character-form/avatar-grid/avatar-grid.component';
import { AvatarPreviewComponent } from '@app/components/character-form/avatar-preview/avatar-preview.component';

@Component({
    selector: 'app-avatar-selector',
    imports: [CommonModule, AvatarPreviewComponent, AvatarGridComponent],
    templateUrl: './avatar-selector.component.html',
})
export class AvatarSelectorComponent {
    @Input() avatars: AvatarI[] = [];
    @Input() selectedAvatarIndex: number | null = null;
    @Output() avatarSelected = new EventEmitter<number>();

    selectAvatar(index: number): void {
        this.avatarSelected.emit(index);
    }
}
