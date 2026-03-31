import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PLAYER_NAME_MAX_LENGTH } from '@common/constants';

@Component({
    selector: 'app-player-name-input',
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './player-name-input.component.html',
})
export class PlayerNameInputComponent {
    @Input() form: FormGroup;
    protected readonly playerNameMaxLength = PLAYER_NAME_MAX_LENGTH;
}
