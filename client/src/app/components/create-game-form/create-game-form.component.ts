import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'app-create-game-form',
    imports: [],
    templateUrl: './create-game-form.component.html',
    styleUrl: './create-game-form.component.scss',
})
export class CreateGameFormComponent {
    constructor(@Inject(MAT_DIALOG_DATA) public data: { name: string }) {}
}
