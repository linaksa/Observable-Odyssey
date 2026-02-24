import { Component } from '@angular/core';
import { GameInfosComponent } from '@app/components/game/game-infos/game-infos.component';
import { GameComponent } from '@app/components/game/game/game.component';
import { PlayerInfoComponent } from '@app/components/game/player-info/player-info.component';
import { PlayerListComponent } from '@app/components/game/player-list/player-list.component';

@Component({
    selector: 'app-game-page',
    imports: [PlayerInfoComponent, GameComponent, PlayerListComponent, GameInfosComponent],
    templateUrl: './game-page.component.html',
})
export class GamePageComponent {}
