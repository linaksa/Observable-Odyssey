import { Component } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CreateGameFormComponent } from '@app/components/create-game-form/create-game-form.component';
import { AppMaterialModule } from '@app/modules/material.module';

// mock
const ELEMENT_DATA = [{ name: 'Hydrogen', size: 1.0079, mode: 'H', lastEdited: '2024-01-01', image: 'assets/images/hydrogen.png' }];

@Component({
    selector: 'app-create-page',
    imports: [MatTableModule, MatTooltipModule, MatDialogModule, AppMaterialModule],
    templateUrl: './create-page.component.html',
    styleUrl: './create-page.component.scss',
})
export class CreatePageComponent {
    displayedColumns: string[] = ['image', 'name', 'size', 'mode', 'lastEdited', 'actions'];
    dataSource = ELEMENT_DATA;

    constructor(private dialog: MatDialog) {}

    openDialog(): void {
        this.dialog.open(CreateGameFormComponent, {
            width: '80%',
            height: '60%',
            data: { name: ELEMENT_DATA[0].name },
        });
    }
}
