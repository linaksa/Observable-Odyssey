import { Component } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

const ELEMENT_DATA = [
  { name: 'Hydrogen', size: 1.0079, mode: 'H', lastEdited: '2024-01-01', image: 'assets/images/hydrogen.png' },
];

@Component({
  selector: 'app-administration-page',
  imports: [MatTableModule, MatIconModule, MatCheckboxModule, MatTooltipModule],
  templateUrl: './administration-page.component.html',
  styleUrl: './administration-page.component.scss',
})
export class AdministrationPageComponent {
  displayedColumns: string[] = ['image', 'name', 'size', 'mode', 'lastEdited', 'visibility', 'actions'];
  dataSource = ELEMENT_DATA;
}
