import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GameService } from '@app/services/game.service';
import { IExistingGame } from '@common/game';

import { GameEditionComponent } from '@app/components/edition/game-edition/game-edition.component';


@Component({
  selector: 'app-edition-page',
  imports: [CommonModule, GameEditionComponent],
  styleUrls: ['./edition-page.component.scss'],
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
    gameService: GameService = inject(GameService);

    editedGame: IExistingGame;

    constructor(private route: ActivatedRoute) {    }


    ngOnInit(): void {
        this.route.params.subscribe(params => {
            this.gameService.getGameById(params.gameId).subscribe(game => {
                this.editedGame = game;
            });
        });
    }

}
