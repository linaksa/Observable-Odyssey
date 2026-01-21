import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GameCreationDialogComponent } from '@app/components/game-creation-dialog/game-creation-dialog.component';
import { AppMaterialModule } from "@app/modules/material.module";
import { AdministrationService } from '@app/services/administrationService';
import { IGame } from '@common/game';

@Component({
  selector: 'app-administration-page',
  imports: [MatTableModule, MatIconModule, MatCheckboxModule, MatTooltipModule, DatePipe, AppMaterialModule],
  templateUrl: './administration-page.component.html',
  styleUrl: './administration-page.component.scss',
})
export class AdministrationPageComponent implements OnInit {
  adminService: AdministrationService = inject(AdministrationService);
  dataSource = new MatTableDataSource<IGame>();
  dialog = inject(MatDialog);
  displayedColumns: string[] = ['image', 'gameTitle', 'size', 'mode', 'lastEdited', 'visibility', 'actions'];


  ngOnInit(): void {
    this.adminService.getAllGames().subscribe((games) => {
      this.dataSource.data = games ?? [];
    });
  }

  openDialog() {

    const dialogConfig = new MatDialogConfig();

    dialogConfig.autoFocus = true;
    dialogConfig.hasBackdrop = true;
    dialogConfig.direction = 'rtl';

    this.dialog.open(GameCreationDialogComponent, dialogConfig);
  }
}
