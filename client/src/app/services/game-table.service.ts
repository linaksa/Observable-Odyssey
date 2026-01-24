import { inject, Injectable } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { IExistingGame } from '@common/game';
import { GameService } from './game.service';


@Injectable({
  providedIn: 'root',
})
export class GameTableServiceService {
  gaemService: GameService = inject(GameService);

  tableData = new MatTableDataSource<IExistingGame>();
  displayedColumns: string[] = [];

  fetchGames(): void {
    this.gaemService.getAllGames().subscribe({
      next: (fetchedGames) => {
        this.tableData.data = fetchedGames ?? [];
      },
    });
  }
}
