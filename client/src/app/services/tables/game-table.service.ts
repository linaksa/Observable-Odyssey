import { inject, Injectable, signal } from '@angular/core';
import { IExistingGame, Visibility } from '@common/game';
import { Subscription } from 'rxjs';
import { GameService } from '@app/services/admin/game.service';

@Injectable({
    providedIn: 'root',
})
export class GameTableService {
    private readonly gameService: GameService = inject(GameService);
    private gameServiceSubscription?: Subscription;

    tableData: IExistingGame[] = [];

    isLoading = signal(false);

    fetchGames(onlyVisible = false): void {
        this.isLoading.set(true);
        this.gameServiceSubscription?.unsubscribe();
        this.gameServiceSubscription = this.gameService.getAllGames().subscribe({
            next: (fetchedGames) => {
                this.tableData = onlyVisible ? (fetchedGames?.filter((game) => game.visibility !== Visibility.Hidden) ?? []) : (fetchedGames ?? []);
            },
            error: () => {
                this.isLoading.set(false);
                this.gameServiceSubscription = undefined;
            },
            complete: () => {
                this.isLoading.set(false);
                this.gameServiceSubscription = undefined;
            },
        });
    }

    onDestroy() {
        this.gameServiceSubscription?.unsubscribe();
    }
}
