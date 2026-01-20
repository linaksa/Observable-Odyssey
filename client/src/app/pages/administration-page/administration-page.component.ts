import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdministrationService } from '@app/services/administrationService';
import { IGame } from '@common/game';

@Component({
  selector: 'app-administration-page',
  imports: [MatTableModule, MatIconModule, MatCheckboxModule, MatTooltipModule, DatePipe],
  templateUrl: './administration-page.component.html',
  styleUrl: './administration-page.component.scss',
})
export class AdministrationPageComponent implements OnInit {
  adminService: AdministrationService = inject(AdministrationService);

  dataSource = new MatTableDataSource<IGame>();
  displayedColumns: string[] = ['image', 'gameTitle', 'size', 'mode', 'lastEdited', 'visibility', 'actions'];

  ngOnInit(): void {
    this.adminService.getAllGames().subscribe((games) => {
      console.log("games are", games)
      this.dataSource.data = games ?? [];
    });
  }
}
