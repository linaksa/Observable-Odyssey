import { Component } from '@angular/core';
import { GameComponent } from '@app/components/game/game/game.component';
import { PlayerInfoComponent } from '@app/components/game/player-info/player-info.component';

@Component({
  selector: 'app-game-page',
  imports: [PlayerInfoComponent, GameComponent],
  templateUrl: './game-page.component.html',
})
export class GamePageComponent {

}
