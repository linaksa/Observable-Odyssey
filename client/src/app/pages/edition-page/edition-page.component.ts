import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GameService } from '@app/services/game.service';
import { GameType, IExistingGame, Visibility } from '@common/game';

import { LoadingOverlayComponent } from '@app/components/common/loading-overlay/loading-overlay.component';
import { GameEditionComponent } from '@app/components/edition/game-edition/game-edition.component';
import { CellType } from '@common/board';
import { GameSize } from '@common/constants';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-edition-page',
    imports: [CommonModule, GameEditionComponent, LoadingOverlayComponent],
    templateUrl: './edition-page.component.html',
})
export class EditionPageComponent implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly gameService = inject(GameService);
    private readonly timeout = 0;

    private routeSubscription?: Subscription;

    editedGame: IExistingGame;
    showButton: boolean = false;

    ngOnInit(): void {
        this.initializeButtonTimeout();

        this.route.params.subscribe((params) => {
            if (params.gameId === 'creation') {
                if (this.gameService.gameUnderCreation) {
                    this.editedGame = this.gameService.gameUnderCreation;
                } else {
                    const size = Math.sqrt(GameSize.Small);
                    this.editedGame = {
                        _id: '',
                        gameTitle: '',
                        gameMode: GameType.Classic,
                        description: '',
                        lastModifiedDate: new Date(),
                        dateCreated: new Date(),
                        visibility: Visibility.Hidden,
                        preview: '',
                        board: {
                            items: [],
                            cells: Array.from({ length: size }, () => Array(size).fill(CellType.Empty)),
                        },
                    };
                }
            } else {
                this.gameService.getGameById(params.gameId).subscribe((game) => {
                    this.editedGame = game;
                });
            }
        });
    }

    private initializeButtonTimeout(): void {
        setTimeout(() => {
            this.showButton = true;
        }, this.timeout);
    }

    ngOnDestroy(): void {
        this.routeSubscription?.unsubscribe();
    }
}
