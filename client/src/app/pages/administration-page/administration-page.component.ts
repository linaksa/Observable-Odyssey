import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdministrationService } from '@app/services/administrationService';
import { IExistingGame, Visibility } from '@common/game';

@Component({
  selector: 'app-administration-page',
  imports: [MatTableModule, MatIconModule, MatCheckboxModule, MatTooltipModule, DatePipe],
  templateUrl: './administration-page.component.html',
  styleUrl: './administration-page.component.scss',
})
export class AdministrationPageComponent implements OnInit {
  adminService: AdministrationService = inject(AdministrationService);

  dataSource = new MatTableDataSource<IExistingGame>();
  displayedColumns: string[] = ['image', 'gameTitle', 'size', 'mode', 'lastEdited', 'visibility', 'actions'];

  ngOnInit(): void {
    this.fetchGames();
  }

  fetchGames(): void {
    this.adminService.getAllGames().subscribe((games) => {
      this.dataSource.data = games ?? [];
    });
  }

  gameIsViewable(element: IExistingGame): boolean {
    return element.visibility === Visibility.Viewable;
  }

  toggleVisibility(event: MatCheckboxChange, element: IExistingGame): void {
    const visibility: Visibility = event.checked ? Visibility.Viewable : Visibility.Hidden;
    this.adminService.changeGameVisibility(element._id, visibility).subscribe({
      next: (response) => {
        this.fetchGames();
      },
      error: (error) => {
        console.error('Error changing visibility:', error);
        event.source.checked = !event.checked;
      },
    });
  }
}
