import { inject, Injectable, signal } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { IExistingGame, Visibility } from '@common/game';
import { GameService } from './game.service';

@Injectable({
    providedIn: 'root',
})
export class GameTableServiceService {
    gameService: GameService = inject(GameService);

    tableData = new MatTableDataSource<IExistingGame>();

    isLoading = signal(false);

    fetchGames(): void {
        this.isLoading.set(true);
        this.gameService.getAllGames().subscribe({
            next: (fetchedGames) => {
                this.tableData.data = fetchedGames ?? [];
            },
            complete: () => {
                this.isLoading.set(false);
            },
        });
    }

    fetchVisibleGames(): void {
        this.isLoading.set(true);
        this.gameService.getAllGames().subscribe({
            next: (fetchedGames) => {
                this.tableData.data = fetchedGames?.filter((game) => game.visibility !== Visibility.Hidden) ?? [];
            },
            complete: () => {
                this.isLoading.set(false);
            },
        });
    }
}
