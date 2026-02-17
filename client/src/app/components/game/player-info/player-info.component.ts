import { Component, inject, OnInit } from '@angular/core';
import { ActiveGameService } from '@app/services/active-game.service';
import { ICharacter } from '@common/character';

@Component({
  selector: 'app-player-info',
  imports: [],
  templateUrl: './player-info.component.html',
})
export class PlayerInfoComponent implements OnInit {
  activeGameService = inject(ActiveGameService);
  player: ICharacter | undefined;

  ngOnInit() {
    this.player = this.activeGameService.getPlayerByName(this.activeGameService.playerName);
  }

  get avatarUrl(): string {
    return this.player ? `assets/form-page/${this.player.avatar}.png` : '';
  }

  get boardSize(): string {
    const size = this.activeGameService.activeGame.game.board.cells.length;
    return `${size}x${size}`;
  }
}
