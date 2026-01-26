import { inject, Injectable } from '@angular/core';
import { Visibility } from '@common/game';
import { HttpResponse } from 'node_modules/@angular/common/types/_module-chunk';
import { Observable } from 'rxjs';
import { GameService } from './game.service';

@Injectable({
    providedIn: 'root',
})
export class AdministrationService {
    gameService: GameService = inject(GameService);

    changeGameVisibility(gameId: string, visible: boolean): Observable<HttpResponse<string>> {
        const visibility: Visibility = visible ? Visibility.Viewable : Visibility.Hidden;
        return this.gameService.changeGameVisibility(gameId, visibility);
    }
}
