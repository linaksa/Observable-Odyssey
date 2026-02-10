import { inject, Injectable, signal } from '@angular/core';
import { IExistingGame, Visibility } from '@common/game';
import { GameService } from './game.service';

@Injectable({
    providedIn: 'root',
})
export class GameTableService {
    gameService: GameService = inject(GameService);

    tableData: IExistingGame[] = [];

    isLoading = signal(false);

    fetchGames(): void {
        this.isLoading.set(true);
        this.gameService.getAllGames().subscribe({
            next: (fetchedGames) => {
                this.tableData = fetchedGames ?? [];
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
                this.tableData = fetchedGames?.filter((game) => game.visibility !== Visibility.Hidden) ?? [];
            },
            complete: () => {
                this.isLoading.set(false);
            },
        });
    }
}
