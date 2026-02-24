import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoadingOverlayComponent } from '@app/components/common/loading-overlay/loading-overlay.component';
import { ActiveGameTableService } from '@app/services/active-game-table.service';

@Component({
  selector: 'app-active-game-table',
  imports: [LoadingOverlayComponent, RouterLink],
  templateUrl: './active-game-table.component.html',
})
export class ActiveGameTableComponent implements OnInit {
  activeGameTableService = inject(ActiveGameTableService);
  
  ngOnInit(): void {
    this.activeGameTableService.fetchJoinableActiveGames();
  }
}
