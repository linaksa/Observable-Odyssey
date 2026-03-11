import { Injectable } from '@angular/core';
import { ActiveGameService } from '@app/services/active-game.service';
import { LocalPlayerService } from '@app/services/local-player.service';
import { SocketService } from '@app/services/socket.service';
import {
    COUNTDOWN_MIN_REMAINING_MS,
    COUNTDOWN_TICK_INTERVAL_MS,
    MILLISECONDS_PER_SECOND,
    TEMPS_PREPA_TOUR,
    TEMPS_TOUR,
} from '@common/constants';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Subscription } from 'rxjs';

@Injectable()
export class GameTurnService {
    // Socket subscriptions for turn events
    private turnPreparingSubscription?: Subscription;
    private turnStartedSubscription?: Subscription;
    // Local timer used only for countdown display
    private countdownInterval?: ReturnType<typeof setInterval>;

    // Local turn state derived from server socket events
    private activeTurnPlayerName: string | null = null;
    private _turnTimeLeftSeconds: number | null = null;
    private _isTurnPreparing = false;

    constructor(
        private readonly socketService: SocketService,
        private readonly activeGameService: ActiveGameService,
        private readonly localPlayerService: LocalPlayerService,
    ) {}

    get turnTimeLeftSeconds(): number | null {
        return this._turnTimeLeftSeconds;
    }

    get isTurnPreparing(): boolean {
        return this._isTurnPreparing;
    }

    get currentPlayerName(): string | null {
        if (this.activeTurnPlayerName) {
            return this.activeTurnPlayerName;
        }

        const activeGame = this.activeGameService.activeGame;
        if (!activeGame?.players?.length) {
            return null;
        }

        const player = activeGame.players[activeGame.currentPlayerIndex];
        return player?.name ?? null;
    }

    get canEndTurn(): boolean {
        if (this._isTurnPreparing) {
            return false;
        }

        const localPlayerName = this.localPlayerService.getLocalPlayer()?.name;
        return !!localPlayerName && localPlayerName === this.currentPlayerName;
    }

    // Registers socket listeners once for the turn lifecycle
    initializeTurnListeners(): void {
        if (this.turnPreparingSubscription || this.turnStartedSubscription) {
            return;
        }

        this.turnPreparingSubscription = this.socketService.on<{ player: string }>(Namespaces.Game, SocketEvent.TurnPreparing).subscribe({
            next: ({ player }) => {
                this.activeTurnPlayerName = player;
                this._isTurnPreparing = true;
                this.startCountdown(TEMPS_PREPA_TOUR);
            },
        });

        this.turnStartedSubscription = this.socketService.on<{ player: string }>(Namespaces.Game, SocketEvent.TurnStarted).subscribe({
            next: ({ player }) => {
                this.activeTurnPlayerName = player;
                this._isTurnPreparing = false;
                this.startCountdown(TEMPS_TOUR);
            },
        });
    }

    // Requests the server to end the current turn (server is authoritative)
    endTurn(): void {
        const activeGameId = this.activeGameService.activeGame?._id;
        if (!activeGameId || !this.canEndTurn) {
            return;
        }

        this.socketService.emit<{ gameId: string; playerName?: string }, void>(Namespaces.Game, SocketEvent.EndTurn, {
            gameId: activeGameId,
            playerName: this.localPlayerService.getKnownPlayerName(),
        });
    }

    // Cleanup when the consuming component is destroyed
    destroy(): void {
        this.turnPreparingSubscription?.unsubscribe();
        this.turnStartedSubscription?.unsubscribe();
        this.turnPreparingSubscription = undefined;
        this.turnStartedSubscription = undefined;
        this.stopCountdown();
    }

    // UI-only countdown triggered by server events
    private startCountdown(durationMs: number): void {
        this.stopCountdown();
        const deadline = Date.now() + durationMs;
        this._turnTimeLeftSeconds = Math.ceil(durationMs / MILLISECONDS_PER_SECOND);

        this.countdownInterval = setInterval(() => {
            const remainingMs = deadline - Date.now();
            const nextSeconds = Math.ceil(Math.max(remainingMs, COUNTDOWN_MIN_REMAINING_MS) / MILLISECONDS_PER_SECOND);
            this._turnTimeLeftSeconds = nextSeconds;

            if (remainingMs <= COUNTDOWN_MIN_REMAINING_MS) {
                this.stopCountdown();
            }
        }, COUNTDOWN_TICK_INTERVAL_MS);
    }

    // Stops the local timer and clears its reference
    private stopCountdown(): void {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = undefined;
        }
    }
}
