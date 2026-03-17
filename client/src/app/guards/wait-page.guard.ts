import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ActiveGameService } from '@app/services/active-game.service';
import { LocalPlayerService } from '@app/services/local-player.service';

export const waitPageGuard: CanActivateFn = (route) => {
    const localPlayerService = inject(LocalPlayerService);
    const activeGameService = inject(ActiveGameService);
    const router = inject(Router);

    if (!localPlayerService.getLocalPlayer()) {
        return router.createUrlTree(['/home']);
    }

    const activeGameId = route.paramMap.get('activeGameId');
    if (!activeGameId) {
        return router.createUrlTree(['/home']);
    }

    const activeGame = activeGameService.activeGame;
    const isCurrentActiveGame = activeGame?._id === activeGameId;
    const gameHasStarted = isCurrentActiveGame && (activeGame.turnOrder?.length ?? 0) > 0;

    if (gameHasStarted) {
        return router.createUrlTree(['/play', activeGameId]);
    }

    return true;
};
