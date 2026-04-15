import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
    GAME_CANCELED_DEFAULT_END_MESSAGE,
    GAME_CANCELED_END_MESSAGE_BY_REASON,
    GAME_ENDED_REDIRECT_TO_HOME_MESSAGE,
    GAME_ENDED_REDIRECT_TO_STATS_MESSAGE,
} from '@app/constants/game-cancellation';
import { GAME_ENDED_HOST_BINDINGS } from '@app/constants/component-host-bindings';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { END_GAME_SCREEN_DURATION_MS } from '@common/constants';
import { type GameCanceledReason } from '@common/socket-payloads';

@Component({
    selector: 'app-game-ended',
    templateUrl: './game-ended.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: GAME_ENDED_HOST_BINDINGS,
})
export class GameEndedComponent implements OnInit, OnDestroy {
    private readonly router = inject(Router);
    private readonly activeGameService = inject(ActiveGameService);
    private readonly localPlayerService = inject(LocalPlayerService);
    private timeoutId?: ReturnType<typeof setTimeout>;

    protected get winner(): string | null {
        return this.activeGameService.activeGame?.winner ?? null;
    }

    protected get isFinished(): boolean {
        return this.activeGameService.activeGame?.isFinished ?? false;
    }

    protected get cancellationReason(): GameCanceledReason | null {
        return this.activeGameService.gameCanceledReason();
    }

    protected get cancellationMessage(): string {
        return this.cancellationReason ? GAME_CANCELED_END_MESSAGE_BY_REASON[this.cancellationReason] : GAME_CANCELED_DEFAULT_END_MESSAGE;
    }

    protected get redirectMessage(): string {
        return this.cancellationReason ? GAME_ENDED_REDIRECT_TO_HOME_MESSAGE : GAME_ENDED_REDIRECT_TO_STATS_MESSAGE;
    }

    ngOnInit(): void {
        const activeGameId = this.activeGameService.activeGame?._id;
        if (!this.isFinished || !activeGameId) {
            return;
        }

        this.timeoutId = setTimeout(() => {
            if (this.cancellationReason) {
                this.localPlayerService.clear();
                void this.router.navigate(['/home']);
                return;
            }

            void this.router.navigate([`/end/${activeGameId}`]);
        }, END_GAME_SCREEN_DURATION_MS);
    }

    ngOnDestroy(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    }
}
