import { Router } from '@angular/router';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { ToastService } from '@app/services/ui/toast.service';
import { IActiveGame } from '@common/activeGame';
import { CombatOutcome } from '@common/attackResult';
import { ICharacter } from '@common/character';
import { Namespaces } from '@common/namespaces';
import { PlayerMovedResult } from '@common/playerMovedResult';
import { SocketEvent } from '@common/socket-events';
import { ITurnStartedPayload } from '@common/socket-payloads';
import { Subscription } from 'rxjs';

interface BooleanSignal {
    update(updater: (current: boolean) => boolean): void;
}

export interface ActiveGameSocketContext {
    socket: SocketService;
    localPlayer: LocalPlayerService;
    toastService: ToastService;
    router: Router;
    getActiveGame: () => IActiveGame | undefined;
    setActiveGame: (activeGame: IActiveGame) => void;
    getPlayerByName: (playerName: string) => ICharacter | undefined;
    setCombatOutcome: (combatOutcome: CombatOutcome) => void;
    currentPlayer: {
        set(value: number): void;
    };
    hasChangedLocation: BooleanSignal;
    hasAbandonned: BooleanSignal;
    gameHasEnded: BooleanSignal;
}

export function registerActiveGameSocketListeners(context: ActiveGameSocketContext): Subscription[] {
    return [
        context.socket.on<PlayerMovedResult>(Namespaces.Game, SocketEvent.PlayerMoved).subscribe((playerMove) => {
            const activeGame = context.getActiveGame();
            if (!activeGame) {
                return;
            }

            const player = context.getPlayerByName(playerMove.playerId);
            if (!player) return;

            player.positionGrille.x = playerMove.newPosition.x;
            player.positionGrille.y = playerMove.newPosition.y;
            player.movementLeft = playerMove.movementLeft;

            toggle(context.hasChangedLocation);
        }),
        context.socket.on<{ player: string }>(Namespaces.Game, SocketEvent.TurnPreparing).subscribe((data) => {
            const activeGame = context.getActiveGame();
            if (!activeGame) {
                return;
            }

            const index = activeGame.turnOrder.findIndex((playerName) => playerName === data.player);
            if (index !== -1) {
                activeGame.currentPlayerIndex = index;
                context.currentPlayer.set(index);
                toggle(context.hasChangedLocation);
            }
        }),
        context.socket.on<ITurnStartedPayload>(Namespaces.Game, SocketEvent.TurnStarted).subscribe((data) => {
            const activeGame = context.getActiveGame();
            if (!activeGame) {
                return;
            }

            const index = activeGame.turnOrder.findIndex((playerName) => playerName === data.player);
            const currentPlayer = context.getPlayerByName(data.player);

            if (index !== -1 && currentPlayer) {
                currentPlayer.movementLeft = data.movementLeft;
                currentPlayer.actionsLeft = data.actionLeft;
                activeGame.currentPlayerIndex = index;
                context.currentPlayer.set(index);
                toggle(context.hasChangedLocation);
            }
        }),

        context.socket.on<IActiveGame>(Namespaces.Game, SocketEvent.CombatStarted).subscribe((data) => {
            const activeGame = context.getActiveGame();
            if (!activeGame) {
                return;
            }

            context.setActiveGame(data);
        }),

        context.socket.on<IActiveGame>(Namespaces.Game, SocketEvent.CombatTurnStart).subscribe((data) => {
            const activeGame = context.getActiveGame();
            if (!activeGame) {
                return;
            }

            context.setActiveGame(data);
        }),

        context.socket.on<CombatOutcome>(Namespaces.Game, SocketEvent.CombatResolved).subscribe((combatOutcome) => {
            const activeGame = context.getActiveGame();
            if (!activeGame) {
                return;
            }
            context.setCombatOutcome(combatOutcome);
            context.setActiveGame(combatOutcome.updatedActiveGame);
        }),

        context.socket.on<{ playerId: string }>(Namespaces.Game, SocketEvent.PlayerAbandoned).subscribe((data) => {
            const activeGame = context.getActiveGame();
            if (!activeGame) {
                return;
            }

            const player = context.getPlayerByName(data.playerId);
            if (!player) return;

            player.hasAbandoned = true;

            toggle(context.hasAbandonned);
        }),
        context.socket.on<{ playerId: string }>(Namespaces.Game, SocketEvent.PlayerKicked).subscribe((data) => {
            const activeGame = context.getActiveGame();
            if (!activeGame) {
                return;
            }

            activeGame.players = activeGame.players.filter((player: ICharacter) => player.name !== data.playerId);

            if (data.playerId !== context.localPlayer.getLocalPlayer()?.name) {
                return;
            }

            context.localPlayer.clear();
            context.toastService.show('Vous avez été expulsé de la partie');
            context.router.navigate(['/']);
        }),
        context.socket.on<{ playerId: string }>(Namespaces.Game, SocketEvent.LeftWaitingRoom).subscribe((data) => {
            const activeGame = context.getActiveGame();
            if (!activeGame) {
                return;
            }

            const player = context.getPlayerByName(data.playerId);
            if (!player) return;

            activeGame.players = activeGame.players.filter((p: ICharacter) => p.name !== data.playerId);
        }),
        context.socket.on<{ winner: string }>(Namespaces.Game, SocketEvent.GameEnded).subscribe((data) => {
            const activeGame = context.getActiveGame();
            if (!activeGame) {
                return;
            }

            activeGame.winner = data.winner;
            activeGame.isFinished = true;

            toggle(context.gameHasEnded);
        }),
        context.socket.on<{ winner: string }>(Namespaces.Game, SocketEvent.GameCanceled).subscribe(() => {
            context.localPlayer.clear();
            context.toastService.show("L'organiseur a annulé la partie.");
            context.router.navigate(['/home']);
        }),
    ];
}

function toggle(signalRef: BooleanSignal): void {
    signalRef.update((current) => !current);
}
