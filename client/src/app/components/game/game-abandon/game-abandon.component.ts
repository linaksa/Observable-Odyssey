import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';

@Component({
    selector: 'app-game-abandon',
    templateUrl: './game-abandon.component.html',
})
export class GameAbandonComponent {
    private activeGameService = inject(ActiveGameService);
    private localPlayerService = inject(LocalPlayerService);
    private router = inject(Router);

    abandon(): void {
        const player = this.localPlayerService.getLocalPlayer();

        if (!player) return;

        this.activeGameService.abandonGame(player.name);

        this.router.navigate(['/']);
    }
}
