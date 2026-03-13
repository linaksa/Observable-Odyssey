import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { IActiveGame } from '@common/activeGame';
import { Subscription } from 'rxjs';
import { GameService } from './game.service';

@Injectable({
    providedIn: 'root',
})
export class ActiveGameTableService implements OnDestroy {
    private gameServiceSubscription?: Subscription;
    private readonly gameService: GameService = inject(GameService);

    tableData: IActiveGame[] = [];

    isLoading = signal(false);

    fetchJoinableActiveGames(): void {
        this.isLoading.set(true);
        this.gameServiceSubscription?.unsubscribe();
        this.gameServiceSubscription = this.gameService.fetchJoinableActiveGames().subscribe({
            next: (fetchedJoinableActiveGames) => {
                this.tableData = fetchedJoinableActiveGames ?? [];
            },
            complete: () => {
                this.isLoading.set(false);
            },
            error: () => {
                this.isLoading.set(false);
            },
        });
    }

    ngOnDestroy() {
        this.gameServiceSubscription?.unsubscribe();
    }
}
