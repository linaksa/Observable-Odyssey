import { Component, inject } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { AdminGameTableComponent } from '@app/components/admin-game-table/admin-game-table.component';
import { GameCreationDialogComponent } from '@app/components/game-creation-dialog/game-creation-dialog.component';

@Component({
    selector: 'app-administration-page',
    imports: [MatTableModule, MatIconModule, MatCheckboxModule, MatTooltipModule, RouterModule, AdminGameTableComponent],
    templateUrl: './administration-page.component.html',
    styleUrl: './administration-page.component.scss',
})
export class AdministrationPageComponent {


    dialog = inject(MatDialog);


    openDialog() {

        const dialogConfig = new MatDialogConfig();

        dialogConfig.autoFocus = true;
        dialogConfig.hasBackdrop = true;
        dialogConfig.direction = 'rtl';
        dialogConfig.width = '25vw';
        dialogConfig.height = '25vw';

        this.dialog.open(GameCreationDialogComponent, dialogConfig);
    }
}
