import { inject, Injectable, signal } from '@angular/core';
import { IActiveGame } from '@common/activeGame';
import { GameService } from './game.service';

@Injectable({
  providedIn: 'root',
})
export class ActiveGameTableService {
      gameService: GameService = inject(GameService);
  
      tableData: IActiveGame[] = [];
  
      isLoading = signal(false);
  
      fetchJoinableActiveGames(): void {
          this.isLoading.set(true);
          this.gameService.featchJoinableActiveGames().subscribe({
              next: (fetchedJoinableActiveGames) => {
                  this.tableData = fetchedJoinableActiveGames ?? [];
              },
              complete: () => {
                  this.isLoading.set(false);
              },
          });
      }
}
