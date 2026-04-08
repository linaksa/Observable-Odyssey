import { inject, Injectable } from '@angular/core';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/activeGame';
import {
    COUNTDOWN_MIN_REMAINING_MS,
    COUNTDOWN_TICK_INTERVAL_MS,
    MILLISECONDS_PER_SECOND,
    COMBAT_TIME_MS,
    TURN_PREPARATION_TIME_MS,
    TURN_TIME_MS,
} from '@common/constants';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { ITurnStartedPayload } from '@common/socket-payloads';
import { Subscription } from 'rxjs';

@Injectable()
export class GameTurnService {
    // Services
    private readonly socketService = inject(SocketService);
    private readonly activeGameService = inject(ActiveGameService);
    private readonly localPlayerService = inject(LocalPlayerService);

    // Socket subscriptions for turn events
    private turnPreparingSubscription?: Subscription;
    private turnStartedSubscription?: Subscription;
    private turnStopSubscription?: Subscription;
    private combatTurnStartedSubscription?: Subscription;

    // Local timer used only for countdown display
    private countdownInterval?: ReturnType<typeof setInterval>;

    // Local turn state derived from server socket events
    private activeTurnPlayerName: string | null = null;
    private _turnTimeLeftSeconds: number | null = null;
    private _isTurnPreparing = false;

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

        return activeGame.turnOrder[activeGame.currentPlayerIndex] ?? null;
    }

    get canEndTurn(): boolean {
        if (this._isTurnPreparing) return false;

        const localPlayer = this.localPlayerService.getLocalPlayer();
        if (!localPlayer) return false;

        // In debug mode, the organizer can end any active player's turn
        if (this.activeGameService.isDebugMode()) {
            const activeGame = this.activeGameService.activeGame;
            if (activeGame?.organizerName === localPlayer.name) return true;
        }

        return localPlayer.name === this.currentPlayerName;
    }

    // Registers socket listeners once for the turn lifecycle
    initializeTurnListeners(): void {
        if (this.turnPreparingSubscription || this.turnStartedSubscription) {
            return;
        }

        this.turnPreparingSubscription = this.socketService.on<{ player: string }>(Namespaces.Game, SocketEvent.TurnPreparing).subscribe({
            next: ({ player }) => {
                this.clearReachableTiles();
                this.activeTurnPlayerName = player;
                this.syncActiveGameTurnState(player);
                this._isTurnPreparing = true;
                this.startCountdown(TURN_PREPARATION_TIME_MS);
            },
        });

        this.turnStartedSubscription = this.socketService.on<ITurnStartedPayload>(Namespaces.Game, SocketEvent.TurnStarted).subscribe({
            next: ({ player, movementLeft, actionLeft, timeLeft }) => {
                this.clearReachableTiles();
                this.activeTurnPlayerName = player;
                this.syncActiveGameTurnState(player, movementLeft, actionLeft);
                this._isTurnPreparing = false;

                const countdownDuration = timeLeft ? timeLeft : TURN_TIME_MS;
                this.startCountdown(countdownDuration);
            },
        });

        this.combatTurnStartedSubscription = this.socketService.on<IActiveGame>(Namespaces.Game, SocketEvent.CombatTurnStart).subscribe({
            next: (activeGame) => {
                const currentAttack = activeGame.currentAttack;
                if (!currentAttack) return;

                const localPlayer = this.localPlayerService.getLocalPlayer();
                if (!localPlayer) return;

                // Only start the combat turn timer if the local player is involved in the attack
                this.stopCountdown();
                if (currentAttack.attacker === localPlayer.name || currentAttack.defender === localPlayer.name) {
                    this.startCountdown(COMBAT_TIME_MS);
                }
            },
        });
    }

    // Requests the server to end the current turn (server is authoritative)
    endTurn(): void {
        const activeGameId = this.activeGameService.activeGame?._id;
        if (!activeGameId || !this.canEndTurn) {
            return;
        }

        this.socketService.emit<string, void>(Namespaces.Game, SocketEvent.EndTurn, activeGameId);
    }

    // Cleanup when the consuming component is destroyed
    destroy(): void {
        this.turnPreparingSubscription?.unsubscribe();
        this.turnStartedSubscription?.unsubscribe();
        this.turnStopSubscription?.unsubscribe();
        this.combatTurnStartedSubscription?.unsubscribe();
        this.turnPreparingSubscription = undefined;
        this.turnStartedSubscription = undefined;
        this.turnStopSubscription = undefined;
        this.combatTurnStartedSubscription = undefined;
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
    stopCountdown(): void {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = undefined;
        }
    }

    private syncActiveGameTurnState(playerName: string, movementLeft?: number, actionsLeft?: number): void {
        const activeGame = this.activeGameService.activeGame;
        if (!activeGame?.turnOrder?.length) {
            return;
        }

        const nextIndex = activeGame.turnOrder.findIndex((name) => name === playerName);
        if (nextIndex === -1) {
            return;
        }

        activeGame.currentPlayerIndex = nextIndex;
        if (movementLeft !== undefined) {
            const activePlayer = this.activeGameService.getPlayerByName(playerName);
            if (activePlayer) {
                activePlayer.movementLeft = movementLeft;
            }
        }

        if (actionsLeft !== undefined) {
            const activePlayer = this.activeGameService.getPlayerByName(playerName);
            if (activePlayer) {
                activePlayer.actionsLeft = actionsLeft;
            }
        }

        this.activeGameService.currentPlayer.set(nextIndex);
        this.activeGameService.hasChangedLocation.set(!this.activeGameService.hasChangedLocation());
    }

    private clearReachableTiles(): void {
        this.activeGameService.reachableTiles = new Set<number>();
    }
}
