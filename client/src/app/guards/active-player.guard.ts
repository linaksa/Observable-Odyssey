import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LocalPlayerService } from '@app/services/local-player.service';

export const activePlayerGuard: CanActivateFn = () => {
    const localPlayerService = inject(LocalPlayerService);
    const router = inject(Router);

    if (localPlayerService.getLocalPlayer()) {
        return true;
    }

    return router.createUrlTree(['/home']);
};
