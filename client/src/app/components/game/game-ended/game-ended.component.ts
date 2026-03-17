import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { TEMPS_ECRAN_FIN_PARTIE } from '@common/constants';

@Component({
    selector: 'app-game-ended',
    templateUrl: './game-ended.component.html',
})
export class GameEndedComponent {
    private router = inject(Router);
    private activeGameService = inject(ActiveGameService);

    winner: string | null = this.activeGameService.activeGame?.winner ?? null;

    constructor() {
        setTimeout(() => {
            this.router.navigate(['/']);
        }, TEMPS_ECRAN_FIN_PARTIE);
    }

    navigateHome() {
        this.router.navigate(['/']);
    }

    get isFinished() {
        return this.activeGameService.activeGame?.isFinished;
    }
}
