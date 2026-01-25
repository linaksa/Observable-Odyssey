import { Component, inject } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { GameCreationDialogComponent } from '@app/components/game-creation-dialog/game-creation-dialog.component';
import { GameTableComponent } from '@app/components/game-table/game-table.component';

@Component({
    selector: 'app-administration-page',
    imports: [GameTableComponent, RouterLink],
    templateUrl: './administration-page.component.html',
    styleUrl: './administration-page.component.scss',
})
export class AdministrationPageComponent {
    dialog = inject(MatDialog);

    openDialog() {
        const dialogConfig = new MatDialogConfig();

        dialogConfig.autoFocus = true;
        dialogConfig.hasBackdrop = true;
        dialogConfig.width = '25vw';
        dialogConfig.height = '25vw';

        this.dialog.open(GameCreationDialogComponent, dialogConfig);
    }
}
