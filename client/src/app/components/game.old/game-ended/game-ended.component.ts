import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { END_GAME_SCREEN_DURATION_MS } from '@common/constants';

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
            this.router.navigate([`/end/${this.activeGameService.activeGame._id}`]);
        }, END_GAME_SCREEN_DURATION_MS);
    }

    get isFinished() {
        return this.activeGameService.activeGame?.isFinished;
    }
}
