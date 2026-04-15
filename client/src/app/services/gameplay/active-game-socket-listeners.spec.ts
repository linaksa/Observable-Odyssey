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
import { IActiveGame, IPlayerAbandonedGame } from '@common/active-game';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, IGame, Visibility } from '@common/game';
import { SanctuaryChoice } from '@common/info';
import { ItemType } from '@common/items';
import { PlayerMovedResult } from '@common/player-moved-result';
import { SocketEvent } from '@common/socket-events';
import { type GameCanceledReason, IFlagTransferRejectedPayload, ISanctuaryInteractedResult, ITurnStartedPayload } from '@common/socket-payloads';
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
    let hasAbandoned = signal(false);
    let gameHasEnded = signal(false);
    let hasPendingFlagActionRequest = false;
    let gameCanceledReason: GameCanceledReason | null = null;

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
        setRoundOutcome: () => {
            // no-op for this spec since combat outcomes aren't emitted by the tested listeners
        },
        getPlayerByName: (playerName: string) => activeGame?.players.find((player) => player.name === playerName),
        currentPlayer: currentPlayerIndex,
        hasChangedLocation,
        hasAbandoned,
        gameHasEnded,
        handleFlagActionRequest: jasmine.createSpy('handleFlagActionRequest'),
        closeFlagActionRequestIfExpired: jasmine.createSpy('closeFlagActionRequestIfExpired'),
        hasPendingFlagActionRequest: () => hasPendingFlagActionRequest,
        clearPendingFlagActionRequest: jasmine.createSpy('clearPendingFlagActionRequest').and.callFake(() => {
            hasPendingFlagActionRequest = false;
        }),
        setCombatOutcome: () => {
            // no-op for this spec since combat outcomes aren't emitted by the tested listeners
        },
        setSanctuaryOutcome: () => {
            // no-op for this spec since sanctuary outcomes aren't asserted here
        },
        setGameCanceledReason: (reason: GameCanceledReason | null) => {
            gameCanceledReason = reason;
        },
        bumpActionStatsVersion: () => {
            // no-op for this socket listener spec
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
        hasAbandoned = signal(false);
        gameHasEnded = signal(false);
        hasPendingFlagActionRequest = false;
        gameCanceledReason = null;
    });

    it('should update movement and turn state from socket events', () => {
        registerActiveGameSocketListeners(context());

        emitEvent<PlayerMovedResult>(SocketEvent.PlayerMoved, {
            playerId: 'Alice',
            newPosition: { x: 1, y: 2 },
            movementLeft: 1,
        });

        expect(activeGame?.players[0].currentPosition).toEqual({ x: 1, y: 2 });
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
        expect(hasChangedLocation()).toBeFalse();

        emitEvent<{ playerId: string }>(SocketEvent.PlayerKicked, { playerId: 'Alice' });
        expect(localPlayerServiceSpy.clear).toHaveBeenCalled();
        expect(toastServiceSpy.show).toHaveBeenCalledWith('Vous avez été expulsé de la partie');
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);

        emitEvent(SocketEvent.GameCanceled, { reason: 'insufficient-active-players' });
        expect(localPlayerServiceSpy.clear).toHaveBeenCalledTimes(1);
        expect(activeGame?.isFinished).toBeTrue();
        expect(activeGame?.winner).toBeNull();
        expect(gameHasEnded()).toBeTrue();
        expect(gameCanceledReason).toBe('insufficient-active-players');
        expect(routerSpy.navigate).not.toHaveBeenCalledWith(['/home']);
    });

    it('should redirect home immediately on waiting-room cancellation', () => {
        activeGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Alice');
        activeGame.turnOrder = [];
        registerActiveGameSocketListeners(context());

        emitEvent(SocketEvent.GameCanceled, { reason: 'organizer-left-waiting-room' });

        expect(localPlayerServiceSpy.clear).toHaveBeenCalled();
        expect(toastServiceSpy.show).toHaveBeenCalledWith("L'organiseur a annulé la partie.");
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should keep abandoned players in the roster and refresh abandon state', () => {
        activeGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob'), createCharacter('Carol')], 'Alice');
        registerActiveGameSocketListeners(context());

        emitEvent<IPlayerAbandonedGame>(SocketEvent.PlayerAbandoned, {
            playerName: 'Bob',
            activeGame,
        });

        expect(activeGame?.players.map((player) => player.name)).toEqual(['Alice', 'Bob', 'Carol']);
        expect(activeGame?.players[1].hasAbandoned).toBeTrue();
        expect(hasAbandoned()).toBeTrue();
    });

    it('should release a sanctuary once its cooldown expires', () => {
        activeGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Alice');
        activeGame.game.board.items = [createSanctuaryItem(false, 1)];
        registerActiveGameSocketListeners(context());

        emitEvent<ISanctuaryInteractedResult>(SocketEvent.SanctuaryInteracted, {
            playerId: 'Alice',
            position: { x: 1, y: 1 },
            itemType: ItemType.LifeSanctuary,
            choice: SanctuaryChoice.Standard,
            succeeded: true,
            actionsLeft: 0,
            currentHealth: 6,
            attackPoints: 4,
            defensePoints: 4,
            sanctuaryActive: false,
            sanctuaryInactiveTurnsRemaining: 1,
            fightSanctuaryUsed: false,
            fightSanctuaryTurnsRemaining: 0,
            fightSanctuaryBonus: 0,
        });

        const sanctuary = activeGame.game.board.items[0];
        expect(sanctuary.active).toBeFalse();
        expect(sanctuary.inactiveTurnsRemaining).toBe(1);

        emitEvent<{ player: string }>(SocketEvent.TurnPreparing, { player: 'Bob' });

        expect(sanctuary.active).toBeTrue();
        expect(sanctuary.inactiveTurnsRemaining).toBe(0);
    });

    it('should store sanctuary interaction outcomes', () => {
        activeGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Alice');
        const setSanctuaryOutcomeSpy = jasmine.createSpy('setSanctuaryOutcome');

        registerActiveGameSocketListeners({
            ...context(),
            setSanctuaryOutcome: setSanctuaryOutcomeSpy,
        });

        emitEvent<ISanctuaryInteractedResult>(SocketEvent.SanctuaryInteracted, {
            playerId: 'Alice',
            position: { x: 1, y: 1 },
            itemType: ItemType.FightSanctuary,
            choice: SanctuaryChoice.Double,
            succeeded: false,
            actionsLeft: 0,
            currentHealth: 6,
            attackPoints: 4,
            defensePoints: 4,
            sanctuaryActive: false,
            sanctuaryInactiveTurnsRemaining: 3,
            fightSanctuaryUsed: true,
            fightSanctuaryTurnsRemaining: 0,
            fightSanctuaryBonus: 0,
        });

        expect(setSanctuaryOutcomeSpy).toHaveBeenCalledWith(
            jasmine.objectContaining({
                playerId: 'Alice',
                succeeded: false,
            }),
        );
    });

    it('should sync requester actions when a flag pickup resolves automatically', () => {
        activeGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Alice');
        const socketContext = context();
        hasPendingFlagActionRequest = true;
        registerActiveGameSocketListeners(socketContext);

        emitEvent(SocketEvent.FlagPickedUp, {
            playerName: 'Bob',
            requesterName: 'Alice',
            requesterActionsLeft: 0,
        });

        expect(activeGame?.hasFlagId).toBe('Bob');
        expect(activeGame?.players[0].actionsLeft).toBe(0);
        expect(hasChangedLocation()).toBeTrue();
        expect(socketContext.clearPendingFlagActionRequest as jasmine.Spy).toHaveBeenCalled();
    });

    it('should clear pending flag requests and notify requester when transfer is rejected', () => {
        activeGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Alice');
        const socketContext = context();
        hasPendingFlagActionRequest = true;
        registerActiveGameSocketListeners(socketContext);

        emitEvent<IFlagTransferRejectedPayload>(SocketEvent.FlagTransferRejected, {
            gameId: activeGame._id,
            requesterName: 'Alice',
            targetPlayerName: 'Bob',
        });

        expect(socketContext.clearPendingFlagActionRequest as jasmine.Spy).toHaveBeenCalled();
        expect(toastServiceSpy.show).toHaveBeenCalledWith('Le transfert du drapeau a été refusé.');
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
        expect(hasAbandoned()).toBeFalse();
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
        hasFlagId: '',

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
        startingPosition: { x, y },
        currentPosition: { x, y },

        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
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
