import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GameService } from '@app/services/admin/game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { IActiveGame } from '@common/activeGame';
import { catchError, map, of } from 'rxjs';

export const waitPageGuard: CanActivateFn = (route) => {
    const localPlayerService = inject(LocalPlayerService);
    const gameService = inject(GameService);
    const router = inject(Router);

    // 1. Check synchronous conditions first
    if (!localPlayerService.getLocalPlayer()) {
        return router.createUrlTree(['/home']);
    }

    const activeGameId = route.paramMap.get('activeGameId');
    if (!activeGameId) {
        return router.createUrlTree(['/home']);
    }

    // 2. Return an Observable so Angular waits for it
    return gameService.getActiveGameById(activeGameId).pipe(
        map((activeGame: IActiveGame) => {
            const isCurrentActiveGame = activeGame?._id === activeGameId;
            const gameHasStarted = isCurrentActiveGame && (activeGame?.turnOrder?.length ?? 0) > 0;

            if (gameHasStarted) {
                return router.createUrlTree(['/home', activeGameId]);
            }

            return true;
        }),
        catchError(() => of(router.createUrlTree(['/home']))),
    );
};
