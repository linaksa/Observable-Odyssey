import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { AdminGameTableComponent } from '@app/components/admin-game-table/admin-game-table.component';

@Component({
  selector: 'app-administration-page',
  imports: [MatTableModule, MatIconModule, MatCheckboxModule, MatTooltipModule, DatePipe, RouterModule, AdminGameTableComponent],
  templateUrl: './administration-page.component.html',
  styleUrl: './administration-page.component.scss',
})
export class AdministrationPageComponent {

}
