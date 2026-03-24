/**
 * Testing strategy — Active Game Socket Listeners
 *
 * Approach:
 * - Keep the spec focused on the extracted socket helper rather than the full service.
 * - Drive events through mocked socket streams and assert the resulting state and side effects.
 * - Verify teardown by checking the returned subscriptions can be unsubscribed cleanly.
 *
 * Edge cases covered:
 * - Missing active game: socket events should be ignored safely.
 * - Player and turn updates: the helper should mutate only the expected state.
 * - Kick/cancel flows: the helper should trigger the correct UI and navigation side effects.
 */
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { ActiveGameSocketContext, registerActiveGameSocketListeners } from '@app/services/gameplay/active-game-socket-listeners';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { ToastService } from '@app/services/ui/toast.service';
import { IActiveGame } from '@common/activeGame';
import { AttackResult } from '@common/attackResult';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, IGame, Visibility } from '@common/game';
import { PlayerMovedResult } from '@common/playerMovedResult';
import { SocketEvent } from '@common/socket-events';
import { ITurnStartedPayload } from '@common/socket-payloads';
import { Subject } from 'rxjs';

const DEFAULT_MOVEMENT_LEFT = 3;
const MAX_PLAYER_COUNT = 4;
const EXPECTED_SOCKET_LISTENER_COUNT = 9;

describe('registerActiveGameSocketListeners', () => {
    let socketServiceSpy: jasmine.SpyObj<SocketService>;
    let localPlayerServiceSpy: jasmine.SpyObj<LocalPlayerService>;
    let toastServiceSpy: jasmine.SpyObj<ToastService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let activeGame: IActiveGame | undefined;
    let currentPlayerIndex = signal(0);
    let hasChangedLocation = signal(false);
    let hasAbandonned = signal(false);
    let gameHasEnded = signal(false);

    const eventStreams = new Map<string, Subject<unknown>>();

    const getEventStream = <T>(event: string): Subject<T> => {
        if (!eventStreams.has(event)) {
            eventStreams.set(event, new Subject<unknown>());
        }

        return eventStreams.get(event) as Subject<T>;
    };

    const emitEvent = <T>(event: string, payload: T): void => {
        getEventStream<T>(event).next(payload);
    };

    const context = (): ActiveGameSocketContext => ({
        socket: socketServiceSpy,
        localPlayer: localPlayerServiceSpy,
        toastService: toastServiceSpy,
        router: routerSpy,
        getActiveGame: () => activeGame,
        getPlayerByName: (playerName: string) => activeGame?.players.find((player) => player.name === playerName),
        currentPlayer: currentPlayerIndex,
        hasChangedLocation,
        hasAbandonned,
        gameHasEnded,
    });

    beforeEach(() => {
        socketServiceSpy = jasmine.createSpyObj<SocketService>('SocketService', ['on']);
        localPlayerServiceSpy = jasmine.createSpyObj<LocalPlayerService>('LocalPlayerService', ['getLocalPlayer', 'clear']);
        toastServiceSpy = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
        routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
        routerSpy.navigate.and.resolveTo(true);

        eventStreams.clear();
        socketServiceSpy.on.and.callFake(<T>(_namespace: string, event: string) => getEventStream<T>(event).asObservable());
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Alice'));

        activeGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Alice');
        currentPlayerIndex = signal(activeGame.currentPlayerIndex);
        hasChangedLocation = signal(false);
        hasAbandonned = signal(false);
        gameHasEnded = signal(false);
    });

    it('should register all listeners and support teardown', () => {
        const subscriptions = registerActiveGameSocketListeners(context());

        expect(subscriptions.length).toBe(EXPECTED_SOCKET_LISTENER_COUNT);

        subscriptions.forEach((subscription) => subscription.unsubscribe());

        subscriptions.forEach((subscription) => {
            expect(subscription.closed).toBeTrue();
        });
    });

    it('should update movement and turn state from socket events', () => {
        registerActiveGameSocketListeners(context());

        emitEvent<PlayerMovedResult>(SocketEvent.PlayerMoved, {
            playerId: 'Alice',
            newPosition: { x: 1, y: 2 },
            movementLeft: 1,
        });

        expect(activeGame?.players[0].positionGrille).toEqual({ x: 1, y: 2 });
        expect(activeGame?.players[0].movementLeft).toBe(1);
        expect(hasChangedLocation()).toBeTrue();

        emitEvent<{ player: string }>(SocketEvent.TurnPreparing, { player: 'Bob' });

        expect(activeGame?.currentPlayerIndex).toBe(1);
        expect(currentPlayerIndex()).toBe(1);
        expect(hasChangedLocation()).toBeFalse();

        emitEvent<ITurnStartedPayload>(SocketEvent.TurnStarted, {
            player: 'Bob',
            movementLeft: 2,
            actionLeft: 1,
        });

        expect(activeGame?.players[1].movementLeft).toBe(2);
        expect(activeGame?.players[1].actionsLeft).toBe(1);
        expect(currentPlayerIndex()).toBe(1);
        expect(hasChangedLocation()).toBeTrue();
    });

    it('should update combat and abandonment state from socket events', () => {
        registerActiveGameSocketListeners(context());

        emitEvent<AttackResult>(SocketEvent.AttackResult, {
            attackerName: 'Alice',
            defenderName: 'Bob',
            attackerVictories: 2,
            attackerActionsLeft: 0,
            defenderNewPosition: { x: 2, y: 0 },
        });

        expect(activeGame?.players[0].victories).toBe(2);
        expect(activeGame?.players[0].actionsLeft).toBe(0);
        expect(activeGame?.players[1].positionGrille).toEqual({ x: 2, y: 0 });
        expect(hasChangedLocation()).toBeTrue();

        emitEvent<{ playerId: string }>(SocketEvent.PlayerAbandoned, { playerId: 'Bob' });

        expect(activeGame?.players[1].hasAbandoned).toBeTrue();
        expect(hasAbandonned()).toBeTrue();
    });

    it('should remove players and handle end-of-game side effects', () => {
        activeGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob'), createCharacter('Carol')], 'Alice');
        registerActiveGameSocketListeners(context());

        emitEvent<{ playerId: string }>(SocketEvent.LeftWaitingRoom, { playerId: 'Carol' });
        expect(activeGame?.players.map((player) => player.name)).toEqual(['Alice', 'Bob']);

        emitEvent<{ winner: string }>(SocketEvent.GameEnded, { winner: 'Alice' });
        expect(activeGame?.winner).toBe('Alice');
        expect(activeGame?.isFinished).toBeTrue();
        expect(gameHasEnded()).toBeTrue();

        emitEvent<{ playerId: string }>(SocketEvent.PlayerKicked, { playerId: 'Bob' });
        expect(activeGame?.players.map((player) => player.name)).toEqual(['Alice']);

        emitEvent<{ playerId: string }>(SocketEvent.PlayerKicked, { playerId: 'Alice' });
        expect(localPlayerServiceSpy.clear).toHaveBeenCalled();
        expect(toastServiceSpy.show).toHaveBeenCalledWith('Vous avez été expulsé de la partie');
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);

        emitEvent<{ winner: string }>(SocketEvent.GameCanceled, { winner: '' });
        expect(localPlayerServiceSpy.clear).toHaveBeenCalledTimes(2);
        expect(toastServiceSpy.show).toHaveBeenCalledWith("L'organiseur a annulé la partie.");
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should ignore listener events when no active game is loaded', () => {
        registerActiveGameSocketListeners(context());
        activeGame = undefined;

        emitEvent<PlayerMovedResult>(SocketEvent.PlayerMoved, {
            playerId: 'Alice',
            newPosition: { x: 1, y: 2 },
            movementLeft: 1,
        });
        emitEvent<{ player: string }>(SocketEvent.TurnPreparing, { player: 'Bob' });
        emitEvent<AttackResult>(SocketEvent.AttackResult, {
            attackerName: 'Alice',
            defenderName: 'Bob',
            attackerVictories: 1,
            attackerActionsLeft: 0,
            defenderNewPosition: { x: 1, y: 1 },
        });
        emitEvent<{ playerId: string }>(SocketEvent.PlayerAbandoned, { playerId: 'Bob' });
        emitEvent<{ playerId: string }>(SocketEvent.LeftWaitingRoom, { playerId: 'Carol' });
        emitEvent<{ winner: string }>(SocketEvent.GameEnded, { winner: 'Alice' });

        expect(hasChangedLocation()).toBeFalse();
        expect(hasAbandonned()).toBeFalse();
        expect(gameHasEnded()).toBeFalse();
        expect(localPlayerServiceSpy.clear).not.toHaveBeenCalled();
        expect(toastServiceSpy.show).not.toHaveBeenCalled();
        expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
});

function createActiveGame(players: ICharacter[], currentPlayerName?: string, id = 'active-game-1'): IActiveGame {
    const turnOrder = players.map((player) => player.name);
    const selectedPlayerName = currentPlayerName ?? turnOrder[0] ?? '';
    const currentPlayerIndex = Math.max(turnOrder.indexOf(selectedPlayerName), 0);

    const game: IGame = {
        gameTitle: 'Arena',
        description: '',
        gameMode: GameType.Classic,
        dateCreated: new Date('2026-01-01T00:00:00.000Z'),
        lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
        visibility: Visibility.Hidden,
        preview: '' as Base64URLString,
        board: {
            cells: [
                [CellType.Empty, CellType.Empty],
                [CellType.Empty, CellType.Empty],
            ],
            items: [],
        },
    };

    return {
        _id: id,
        game,
        players,
        currentPlayerIndex,
        turnOrder,
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Organizer',
        maxPlayerCount: MAX_PLAYER_COUNT,
        turnIsInPreparation: false,
    };
}

function createCharacter(name: string, x = 0, y = 0, movementLeft = DEFAULT_MOVEMENT_LEFT): ICharacter {
    return {
        name,
        avatar: Avatar.Avatar1,
        initialHealth: 10,
        currentHealth: 10,
        attackBonusDiceType: DiceType.FourSided,
        defenseBonusDiceType: DiceType.SixSided,
        rapidityPoints: 4,
        attackPoints: 4,
        defensePoints: 4,
        actionsLeft: 1,
        movementLeft,
        victories: 0,
        hasAbandoned: false,
        positionDepart: { x, y },
        positionGrille: { x, y },
    };
}
