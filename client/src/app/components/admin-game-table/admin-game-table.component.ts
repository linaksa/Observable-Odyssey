import { DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { AdministrationService } from '@app/services/administrationService';
import { GameTableServiceService } from '@app/services/game-table.service';
import { IExistingGame, Visibility } from '@common/game';
@Component({
  selector: 'app-admin-game-table',
  imports: [MatTableModule, MatIconModule, MatCheckboxModule, MatTooltipModule, DatePipe, RouterModule],
  templateUrl: './admin-game-table.component.html',
  styleUrl: './admin-game-table.component.scss',
})
export class AdminGameTableComponent implements OnInit {
  adminService: AdministrationService = inject(AdministrationService);
  gameTableService: GameTableServiceService = inject(GameTableServiceService);

  ngOnInit(): void {
    this.gameTableService.displayedColumns = ['image', 'gameTitle', 'size', 'mode', 'lastEdited', 'visibility', 'actions'];
    this.gameTableService.fetchGames();
  }

  gameIsViewable(element: IExistingGame): boolean {
    return element.visibility === Visibility.Viewable;
  }

  toggleVisibility(event: MatCheckboxChange, element: IExistingGame): void {
    event.source.disabled = true;
    this.adminService.changeGameVisibility(element._id, event.checked).subscribe({
      next: () => {
        this.gameTableService.fetchGames();
        event.source.disabled = false;
      },
      error: () => {
        event.source.disabled = false;
        event.source.checked = !event.checked;
      },
    });
  }

  //deleteGame(element: IExistingGame): void {
  //this.adminService.deleteGame(element).subscribe({
  //next: () => {
  //this.dataSource.data = this.dataSource.data.filter(
  //item => item._id !== element._id,
  //);
  //},
  //});
  //}
}
