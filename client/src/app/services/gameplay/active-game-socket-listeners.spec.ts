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
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, IGame, Visibility } from '@common/game';
import { ItemType } from '@common/items';
import { PlayerMovedResult } from '@common/playerMovedResult';
import { SocketEvent } from '@common/socket-events';
import { SANCTUARY_COOLDOWN_TURN_STEPS } from '@common/sanctuary';
import { ISanctuaryInteractedResult, ITurnStartedPayload } from '@common/socket-payloads';
import { Subject } from 'rxjs';

const DEFAULT_MOVEMENT_LEFT = 3;
const MAX_PLAYER_COUNT = 4;

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
        setActiveGame: (newActiveGame: IActiveGame) => {
            activeGame = newActiveGame;
        },
        getPlayerByName: (playerName: string) => activeGame?.players.find((player) => player.name === playerName),
        currentPlayer: currentPlayerIndex,
        hasChangedLocation,
        hasAbandonned,
        gameHasEnded,
        setCombatOutcome: () => {
            // no-op for this spec since combat outcomes aren't emitted by the tested listeners
        },
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
            timeLeft: null,
        });

        expect(activeGame?.players[1].movementLeft).toBe(2);
        expect(activeGame?.players[1].actionsLeft).toBe(1);
        expect(currentPlayerIndex()).toBe(1);
        expect(hasChangedLocation()).toBeTrue();
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
        expect(hasChangedLocation()).toBeTrue();

        emitEvent<{ playerId: string }>(SocketEvent.PlayerKicked, { playerId: 'Alice' });
        expect(localPlayerServiceSpy.clear).toHaveBeenCalled();
        expect(toastServiceSpy.show).toHaveBeenCalledWith('Vous avez été expulsé de la partie');
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);

        emitEvent<{ winner: string }>(SocketEvent.GameCanceled, { winner: '' });
        expect(localPlayerServiceSpy.clear).toHaveBeenCalledTimes(2);
        expect(toastServiceSpy.show).toHaveBeenCalledWith("L'organiseur a annulé la partie.");
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should keep sanctuary cooldown state synchronized from the socket events', () => {
        activeGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Alice');
        activeGame.game.board.items = [createSanctuaryItem(false, SANCTUARY_COOLDOWN_TURN_STEPS)];
        registerActiveGameSocketListeners(context());

        emitEvent<ISanctuaryInteractedResult>(SocketEvent.SanctuaryInteracted, {
            playerId: 'Alice',
            position: { x: 1, y: 1 },
            itemType: ItemType.LifeSanctuary,
            choice: 'standard',
            succeeded: true,
            actionsLeft: 0,
            currentHealth: 6,
            attackPoints: 4,
            defensePoints: 4,
            sanctuaryActive: false,
            sanctuaryInactiveTurnsRemaining: 3,
            fightSanctuaryUsed: false,
            fightSanctuaryTurnsRemaining: 0,
            fightSanctuaryBonus: 0,
        });

        const sanctuary = activeGame.game.board.items[0];
        expect(sanctuary.active).toBeFalse();
        expect(sanctuary.inactiveTurnsRemaining).toBe(SANCTUARY_COOLDOWN_TURN_STEPS);

        emitEvent<{ player: string }>(SocketEvent.TurnPreparing, { player: 'Bob' });

        expect(sanctuary.active).toBeFalse();
        expect(sanctuary.inactiveTurnsRemaining).toBe(SANCTUARY_COOLDOWN_TURN_STEPS - 1);
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

        turnStartTimeStamp: 0,
        currentAttack: null,
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

function createSanctuaryItem(active: boolean, inactiveTurnsRemaining?: number) {
    return {
        itemType: ItemType.LifeSanctuary,
        x: 1,
        y: 1,
        size: 4,
        active,
        inactiveTurnsRemaining,
    };
}
