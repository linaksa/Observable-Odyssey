import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameCreationDialogComponent } from '@app/components/game-creation-dialog/game-creation-dialog.component';
import { GameTableComponent } from '@app/components/game-table/game-table.component';

@Component({
    selector: 'app-administration-page',
    imports: [GameTableComponent, RouterLink, GameCreationDialogComponent],
    templateUrl: './administration-page.component.html',
})
export class AdministrationPageComponent {
    isDialogOpen = false;

    openDialog() {
        this.isDialogOpen = true;
    }

    closeDialog() {
        this.isDialogOpen = false;
    }
}
