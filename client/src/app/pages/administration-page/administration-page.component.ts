import { Component, inject } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdministrationService } from '@app/services/administrationService';

@Component({
  selector: 'app-administration-page',
  imports: [MatTableModule, MatIconModule, MatCheckboxModule, MatTooltipModule],
  templateUrl: './administration-page.component.html',
  styleUrl: './administration-page.component.scss',
})
export class AdministrationPageComponent {
  adminService: AdministrationService = inject(AdministrationService);

  dataSource = this.adminService.getAllGames();

  displayedColumns: string[] = ['image', 'name', 'size', 'mode', 'lastEdited', 'visibility', 'actions'];
}
