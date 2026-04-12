import { ActiveGameSocketContext, BooleanSignal } from '@app/interfaces/active-game-socket.interface';
import { mapErrorCodeToMessage, mapErrorCodesToMessage } from '@app/utils/error-codes';
import { advanceSanctuaryCooldowns, sanctuaryCoversCell } from '@app/utils/sanctuary';
import { IActiveGame, IPlayerAbandonedGame } from '@common/activeGame';
import { CombatOutcome, CombatTurnOutcome } from '@common/attackResult';
import { ICharacter } from '@common/character';
import { ErrorCode, IErrorResponse } from '@common/error-codes';
import { Namespaces } from '@common/namespaces';
import { PlayerMovedResult } from '@common/playerMovedResult';
import { SocketEvent } from '@common/socket-events';
import {
    IDoorToggledResult,
    IFlagActionData,
    IFlagPickedUpPayload,
    IGameCanceledPayload,
    IGameEndedPayload,
    IPlayerIdPayload,
    ISanctuaryInteractedResult,
    ITurnPreparingPayload,
    ITurnStartedPayload,
} from '@common/socket-payloads';
import { Subscription } from 'rxjs';

export type { ActiveGameSocketContext };

export function registerActiveGameSocketListeners(context: ActiveGameSocketContext): Subscription[] {
    return [
        context.socket.on<PlayerMovedResult>(Namespaces.Game, SocketEvent.PlayerMoved).subscribe((playerMove) => {
            const activeGame = context.getActiveGame();
            if (!activeGame) {
                return;
            }

            const player = context.getPlayerByName(playerMove.playerId);
            if (!player) return;

            player.currentPosition.x = playerMove.newPosition.x;
            player.currentPosition.y = playerMove.newPosition.y;
            player.movementLeft = playerMove.movementLeft;

            toggle(context.hasChangedLocation);
        }),
        context.socket.on<ITurnPreparingPayload>(Namespaces.Game, SocketEvent.TurnPreparing).subscribe((data) => {
            const activeGame = context.getActiveGame();
            if (!activeGame) {
                return;
            }

            context.closeFlagActionRequestIfExpired(data.player);

            advanceSanctuaryCooldowns(activeGame.game.board.items);
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

            context.closeFlagActionRequestIfExpired(data.player);

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
        context.socket.on<IDoorToggledResult>(Namespaces.Game, SocketEvent.DoorToggled).subscribe((data) => {
            const activeGame = context.getActiveGame();
            if (!activeGame) {
                return;
            }

            const doorCell = activeGame.game.board.cells[data.position.y]?.[data.position.x];
            if (doorCell === undefined) {
                return;
            }

            activeGame.game.board.cells[data.position.y][data.position.x] = data.cellType;

            const player = context.getPlayerByName(data.playerId);
            if (player) {
                player.actionsLeft = data.actionsLeft;
            }

            toggle(context.hasChangedLocation);
        }),
        context.socket.on<ISanctuaryInteractedResult>(Namespaces.Game, SocketEvent.SanctuaryInteracted).subscribe((data) => {
            const activeGame = context.getActiveGame();
            if (!activeGame) {
                return;
            }

            const player = context.getPlayerByName(data.playerId);
            if (!player) return;

            player.actionsLeft = data.actionsLeft;
            player.currentHealth = data.currentHealth;
            player.attackPoints = data.attackPoints;
            player.defensePoints = data.defensePoints;
            player.fightSanctuaryUsed = data.fightSanctuaryUsed;
            player.fightSanctuaryTurnsRemaining = data.fightSanctuaryTurnsRemaining;
            player.fightSanctuaryBonus = data.fightSanctuaryBonus;

            const sanctuary = activeGame.game.board.items.find((item) => sanctuaryCoversCell(item, data.position.y, data.position.x));
            if (sanctuary) {
                sanctuary.active = data.sanctuaryActive;
                sanctuary.inactiveTurnsRemaining = data.sanctuaryInactiveTurnsRemaining;
            }

            toggle(context.hasChangedLocation);
        }),
        context.socket.on<IErrorResponse>(Namespaces.Game, SocketEvent.DoorToggleError).subscribe((data) => {
            context.toastService.show(mapErrorCodesToMessage(data.errorCodes, mapErrorCodeToMessage(ErrorCode.InvalidDoorTarget, 'Erreur inconnue')));
        }),
        context.socket.on<IErrorResponse>(Namespaces.Game, SocketEvent.SanctuaryInteractionError).subscribe((data) => {
            context.toastService.show(
                mapErrorCodesToMessage(data.errorCodes, mapErrorCodeToMessage(ErrorCode.InvalidSanctuaryTarget, 'Erreur inconnue')),
            );
        }),

        context.socket.on<IActiveGame>(Namespaces.Game, SocketEvent.CombatTurnStart).subscribe((data) => {
            const activeGame = context.getActiveGame();
            if (!activeGame) {
                return;
            }

            context.setRoundOutcome(null);

            context.setActiveGame(data);
        }),

        context.socket.on<CombatOutcome>(Namespaces.Game, SocketEvent.CombatResolved).subscribe((combatOutcome) => {
            const activeGame = context.getActiveGame();
            if (!activeGame) {
                return;
            }

            context.setCombatOutcome(combatOutcome);
            context.setActiveGame(combatOutcome.updatedActiveGame);
            toggle(context.hasChangedLocation);
        }),

        context.socket.on<IPlayerAbandonedGame>(Namespaces.Game, SocketEvent.PlayerAbandoned).subscribe((data) => {
            const activeGame = context.getActiveGame();
            if (!activeGame) {
                return;
            }

            context.setActiveGame({
                ...data.activeGame,
                players: data.activeGame.players.map((player) => (player.name === data.playerName ? { ...player, hasAbandoned: true } : player)),
            });
            toggle(context.hasAbandoned);
        }),
        context.socket.on<IPlayerIdPayload>(Namespaces.Game, SocketEvent.PlayerKicked).subscribe((data) => {
            const activeGame = context.getActiveGame();
            if (!activeGame) {
                return;
            }

            activeGame.players = activeGame.players.filter((player: ICharacter) => player.name !== data.playerId);
            toggle(context.hasChangedLocation);

            if (data.playerId !== context.localPlayer.getLocalPlayer()?.name) {
                return;
            }

            context.localPlayer.clear();
            context.toastService.show('Vous avez été expulsé de la partie');
            context.router.navigate(['/']);
        }),
        context.socket.on<IPlayerIdPayload>(Namespaces.Game, SocketEvent.LeftWaitingRoom).subscribe((data) => {
            const activeGame = context.getActiveGame();
            if (!activeGame) {
                return;
            }

            const player = context.getPlayerByName(data.playerId);
            if (!player) return;

            activeGame.players = activeGame.players.filter((p: ICharacter) => p.name !== data.playerId);
            toggle(context.hasChangedLocation);
        }),
        context.socket.on<IGameEndedPayload>(Namespaces.Game, SocketEvent.GameEnded).subscribe((data) => {
            const activeGame = context.getActiveGame();
            if (!activeGame) {
                return;
            }

            activeGame.winner = data.winner;
            activeGame.isFinished = true;

            toggle(context.gameHasEnded);
        }),
        context.socket.on<IGameCanceledPayload>(Namespaces.Game, SocketEvent.GameCanceled).subscribe(() => {
            context.localPlayer.clear();
            context.toastService.show("L'organiseur a annulé la partie.");
            context.router.navigate(['/home']);
        }),

        context.socket.on<CombatTurnOutcome>(Namespaces.Game, SocketEvent.CombatTurnApplied).subscribe((roundCombatOutcome) => {
            context.setRoundOutcome(roundCombatOutcome);
        }),

        context.socket.on<IFlagPickedUpPayload>(Namespaces.Game, SocketEvent.FlagPickedUp).subscribe((data) => {
            const activeGame = context.getActiveGame();
            if (!activeGame) {
                return;
            }

            const player = context.getPlayerByName(data.playerName);
            if (!player) return;

            activeGame.hasFlagId = player.name;
            const flag = activeGame.game.board.items.find((item) => item.itemType === 'flag');
            if (flag) {
                flag.isCarried = true;
            }
            toggle(context.hasChangedLocation);
        }),
        context.socket.on<IFlagActionData>(Namespaces.Game, SocketEvent.TakeFlag).subscribe((data) => {
            handleFlagActionPrompt(data, SocketEvent.TakeFlag, context);
        }),
        context.socket.on<IFlagActionData>(Namespaces.Game, SocketEvent.GiveFlag).subscribe((data) => {
            handleFlagActionPrompt(data, SocketEvent.GiveFlag, context);
        }),
    ];
}

function toggle(signalRef: BooleanSignal): void {
    signalRef.update((current) => !current);
}

function handleFlagActionPrompt(
    data: IFlagActionData,
    socketEvent: SocketEvent.TakeFlag | SocketEvent.GiveFlag,
    context: ActiveGameSocketContext,
): void {
    const requester = context.getPlayerByName(data.currentPlayerName);
    if (requester) {
        requester.actionsLeft = data.currentPlayerActionsLeft;
        toggle(context.hasChangedLocation);
    }

    context.handleFlagActionRequest(data, socketEvent);
}
