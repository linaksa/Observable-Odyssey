import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/active-game';
import { CombatTurnOutcome } from '@common/attack-result';
import {
    COMBAT_TIME_MS,
    COUNTDOWN_MIN_REMAINING_MS,
    COUNTDOWN_TICK_INTERVAL_MS,
    MILLISECONDS_PER_SECOND,
    TURN_PREPARATION_TIME_MS,
    TURN_TIME_MS,
} from '@common/constants';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { ITurnPreparingPayload, ITurnStartedPayload } from '@common/socket-payloads';
import { Subscription } from 'rxjs';

@Injectable()
export class GameTurnService implements OnDestroy {
    // Services
    private readonly socketService = inject(SocketService);
    private readonly activeGameService = inject(ActiveGameService);
    private readonly localPlayerService = inject(LocalPlayerService);

    // Socket subscriptions for turn events
    private turnPreparingSubscription?: Subscription;
    private turnStartedSubscription?: Subscription;
    private turnStopSubscription?: Subscription;
    private combatStartedSubscription?: Subscription;
    private combatTurnStartedSubscription?: Subscription;
    private combatTurnEndedSubscription?: Subscription;
    private combatResolvedSubscription?: Subscription;

    // Local timers used only for countdown display
    private turnCountdownInterval?: ReturnType<typeof setInterval>;
    private combatCountdownInterval?: ReturnType<typeof setInterval>;

    // Local turn state derived from server socket events
    private activeTurnPlayerName: string | null = null;
    readonly turnTimeLeftSeconds = signal<number | null>(null);
    readonly combatTimeLeftSeconds = signal<number | null>(null);
    readonly isTurnPreparing = signal(false);
    readonly isCombatActive = signal(false);

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
        if (this.isTurnPreparing()) return false;
        if (this.isCombatActive() || !!this.activeGameService.activeGame?.currentAttack) return false;

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
        if (this.turnPreparingSubscription || this.turnStartedSubscription || this.combatStartedSubscription) {
            return;
        }

        this.turnPreparingSubscription = this.socketService.on<ITurnPreparingPayload>(Namespaces.Game, SocketEvent.TurnPreparing).subscribe({
            next: ({ player }) => {
                this.clearReachableTiles();
                this.activeTurnPlayerName = player;
                this.syncActiveGameTurnState(player);
                this.isTurnPreparing.set(true);
                this.isCombatActive.set(false);
                this.stopCombatCountdown();
                this.startCountdown(TURN_PREPARATION_TIME_MS);
            },
        });

        this.turnStartedSubscription = this.socketService.on<ITurnStartedPayload>(Namespaces.Game, SocketEvent.TurnStarted).subscribe({
            next: ({ player, movementLeft, actionLeft, timeLeft }) => {
                this.clearReachableTiles();
                this.activeTurnPlayerName = player;
                this.syncActiveGameTurnState(player, movementLeft, actionLeft);
                this.isTurnPreparing.set(false);
                this.isCombatActive.set(false);
                this.activeGameService.actionMode.set(false);
                this.stopCombatCountdown();

                const countdownDuration = timeLeft ? timeLeft : TURN_TIME_MS;
                this.startCountdown(countdownDuration);
            },
        });

        this.combatStartedSubscription = this.socketService.on<IActiveGame>(Namespaces.Game, SocketEvent.CombatStarted).subscribe({
            next: (activeGame) => {
                if (!activeGame.currentAttack) {
                    return;
                }

                this.isCombatActive.set(true);
                this.activeGameService.actionMode.set(false);
                this.stopCountdown();
                this.startCombatCountdown(COMBAT_TIME_MS);
            },
        });

        this.combatTurnStartedSubscription = this.socketService.on<IActiveGame>(Namespaces.Game, SocketEvent.CombatTurnStart).subscribe({
            next: (activeGame) => {
                const currentAttack = activeGame.currentAttack;
                if (!currentAttack) return;

                this.isCombatActive.set(true);
                this.stopCountdown();
                this.startCombatCountdown(COMBAT_TIME_MS);
            },
        });

        this.combatTurnEndedSubscription = this.socketService.on<CombatTurnOutcome>(Namespaces.Game, SocketEvent.CombatTurnApplied).subscribe({
            next: () => {
                this.stopCombatCountdown();
            },
        });

        this.combatResolvedSubscription = this.socketService.on<IActiveGame>(Namespaces.Game, SocketEvent.CombatResolved).subscribe({
            next: () => {
                this.isCombatActive.set(false);
                this.stopCombatCountdown();
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
        this.combatStartedSubscription?.unsubscribe();
        this.combatTurnStartedSubscription?.unsubscribe();
        this.combatTurnEndedSubscription?.unsubscribe();
        this.combatResolvedSubscription?.unsubscribe();
        this.turnPreparingSubscription = undefined;
        this.turnStartedSubscription = undefined;
        this.turnStopSubscription = undefined;
        this.combatStartedSubscription = undefined;
        this.combatTurnStartedSubscription = undefined;
        this.combatTurnEndedSubscription = undefined;
        this.combatResolvedSubscription = undefined;
        this.stopCountdown();
        this.stopCombatCountdown();
    }

    ngOnDestroy(): void {
        this.destroy();
    }

    // UI-only countdown triggered by server events
    private startCountdown(durationMs: number): void {
        this.stopCountdown();
        const deadline = Date.now() + durationMs;
        this.turnTimeLeftSeconds.set(Math.ceil(durationMs / MILLISECONDS_PER_SECOND));

        this.turnCountdownInterval = setInterval(() => {
            const remainingMs = deadline - Date.now();
            const nextSeconds = Math.ceil(Math.max(remainingMs, COUNTDOWN_MIN_REMAINING_MS) / MILLISECONDS_PER_SECOND);
            this.turnTimeLeftSeconds.set(nextSeconds);

            if (remainingMs <= COUNTDOWN_MIN_REMAINING_MS) {
                this.stopCountdown();
            }
        }, COUNTDOWN_TICK_INTERVAL_MS);
    }

    private startCombatCountdown(durationMs: number): void {
        this.stopCombatCountdown();
        const deadline = Date.now() + durationMs;
        this.combatTimeLeftSeconds.set(Math.ceil(durationMs / MILLISECONDS_PER_SECOND));

        this.combatCountdownInterval = setInterval(() => {
            const remainingMs = deadline - Date.now();
            const nextSeconds = Math.ceil(Math.max(remainingMs, COUNTDOWN_MIN_REMAINING_MS) / MILLISECONDS_PER_SECOND);
            this.combatTimeLeftSeconds.set(nextSeconds);

            if (remainingMs <= COUNTDOWN_MIN_REMAINING_MS) {
                this.stopCombatCountdown();
            }
        }, COUNTDOWN_TICK_INTERVAL_MS);
    }

    // Stops the local timer and clears its reference
    stopCountdown(): void {
        if (this.turnCountdownInterval) {
            clearInterval(this.turnCountdownInterval);
            this.turnCountdownInterval = undefined;
        }
    }

    private stopCombatCountdown(): void {
        if (this.combatCountdownInterval) {
            clearInterval(this.combatCountdownInterval);
            this.combatCountdownInterval = undefined;
        }

        this.combatTimeLeftSeconds.set(null);
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
