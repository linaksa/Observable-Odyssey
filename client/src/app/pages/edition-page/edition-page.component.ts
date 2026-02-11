import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GameService } from '@app/services/game.service';
import { GameType, IExistingGame, Visibility } from '@common/game';

import { GameEditionComponent } from '@app/components/edition/game-edition/game-edition.component';
import { CellType } from '@common/board';
import { GameSize } from '@common/constants';

@Component({
    selector: 'app-edition-page',
    imports: [CommonModule, GameEditionComponent],
    template: `
        <div>
            @if (editedGame) {
                <app-game-edition [gameToEdit]="editedGame"></app-game-edition>
            } @else {
                <p>Chargement du jeu en cours...</p>
            }
        </div>
    `,
})
export class EditionPageComponent implements OnInit {
    editedGame: IExistingGame;
    private readonly route = inject(ActivatedRoute);
    private readonly gameService = inject(GameService);

    ngOnInit(): void {
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
}
