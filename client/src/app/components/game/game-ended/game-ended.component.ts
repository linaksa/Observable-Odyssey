import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GAME_ENDED_HOST_BINDINGS } from '@app/constants/component-host-bindings';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { END_GAME_SCREEN_DURATION_MS } from '@common/constants';

@Component({
    selector: 'app-game-ended',
    templateUrl: './game-ended.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: GAME_ENDED_HOST_BINDINGS,
})
export class GameEndedComponent implements OnInit, OnDestroy {
    private readonly router = inject(Router);
    private readonly activeGameService = inject(ActiveGameService);
    private timeoutId?: ReturnType<typeof setTimeout>;

    protected get winner(): string | null {
        return this.activeGameService.activeGame?.winner ?? null;
    }

    protected get isFinished(): boolean {
        return this.activeGameService.activeGame?.isFinished ?? false;
    }

    ngOnInit(): void {
        const activeGameId = this.activeGameService.activeGame?._id;
        if (!this.isFinished || !activeGameId) {
            return;
        }

        this.timeoutId = setTimeout(() => {
            void this.router.navigate([`/end/${activeGameId}`]);
        }, END_GAME_SCREEN_DURATION_MS);
    }

    ngOnDestroy(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    }
}
