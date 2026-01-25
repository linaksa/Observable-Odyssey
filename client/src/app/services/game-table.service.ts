import { inject, Injectable } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { IExistingGame, Visibility } from '@common/game';
import { GameService } from './game.service';

@Injectable({
    providedIn: 'root',
})
export class GameTableServiceService {
    gameService: GameService = inject(GameService);

    tableData = new MatTableDataSource<IExistingGame>();
    displayedColumns: string[] = [];

    fetchGames(): void {
        this.gameService.getAllGames().subscribe({
            next: (fetchedGames) => {
                this.tableData.data = fetchedGames ?? [];
            },
        });
    }

    fetchVisibleGames(): void {
        this.gameService.getAllGames().subscribe({
            next: (fetchedGames) => {
                this.tableData.data = fetchedGames.filter((game) => game.visibility !== Visibility.Hidden) ?? [];
            },
        });
    }
}
