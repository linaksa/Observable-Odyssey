import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
    selector: 'app-player-name-input',
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './player-name-input.component.html',
})
export class PlayerNameInputComponent {
    @Input() form: FormGroup;
}
