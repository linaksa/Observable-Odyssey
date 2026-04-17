/**
 * Testing strategy — registerActiveGameSocketListeners
 *
 * Approach:
 * - Register listeners with a mocked socket context and drive each event through dedicated Subjects.
 * - Assert active-game mutations, signal updates, and external side effects (toast, router, local-player).
 *
 * Edge cases covered:
 * - Socket payloads are ignored safely when no active game is loaded.
 * - Cancel, abandon, and sanctuary-cooldown events apply the expected cleanup and state transitions.
 */
/* eslint-disable max-lines -- This spec covers several socket event flows and teardown cases in one suite. */
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { ActiveGameSocketContext } from '@app/interfaces/active-game-socket.interface';
import { registerActiveGameSocketListeners } from '@app/services/gameplay/active-game-socket-listeners';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { ToastService } from '@app/services/ui/toast.service';
import { IActiveGame, IPlayerAbandonedGame } from '@common/active-game';
import { CombatOutcome, CombatTurnOutcome } from '@common/attack-result';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { ErrorCode, IErrorResponse } from '@common/error-codes';
import { GameType, IGame, Visibility } from '@common/game';
import { SanctuaryChoice } from '@common/info';
import { IItem, ItemType } from '@common/items';
import { PlayerMovedResult } from '@common/player-moved-result';
import { SocketEvent } from '@common/socket-events';
import {
    type GameCanceledReason,
    IFlagActionData,
    IFlagTransferRejectedPayload,
    ISanctuaryInteractedResult,
    ITurnStartedPayload,
} from '@common/socket-payloads';
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
    const selectedPlayerIndex = Math.max(turnOrder.indexOf(selectedPlayerName), 0);

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
        currentPlayerIndex: selectedPlayerIndex,
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
/* Merged from active-game-socket-listeners.extra.spec.ts */

(() => {
    const MIN_LISTENER_COUNT = 10;

    describe('registerActiveGameSocketListeners (extra)', () => {
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

        let setRoundOutcomeSpy: jasmine.Spy<(outcome: CombatTurnOutcome | null) => void>;
        let setCombatOutcomeSpy: jasmine.Spy;
        let setSanctuaryOutcomeSpy: jasmine.Spy;
        let setActiveGameSpy: jasmine.Spy;
        let clearPendingFlagActionRequestSpy: jasmine.Spy;
        let handleFlagActionRequestSpy: jasmine.Spy;
        let closeFlagActionRequestIfExpiredSpy: jasmine.Spy;
        let bumpActionStatsVersionSpy: jasmine.Spy;

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
                setActiveGameSpy(newActiveGame);
                activeGame = newActiveGame;
            },
            setRoundOutcome: setRoundOutcomeSpy,
            getPlayerByName: (playerName: string) => activeGame?.players.find((player) => player.name === playerName),
            currentPlayer: currentPlayerIndex,
            hasChangedLocation,
            hasAbandoned,
            gameHasEnded,
            handleFlagActionRequest: handleFlagActionRequestSpy,
            closeFlagActionRequestIfExpired: closeFlagActionRequestIfExpiredSpy,
            hasPendingFlagActionRequest: () => hasPendingFlagActionRequest,
            clearPendingFlagActionRequest: clearPendingFlagActionRequestSpy,
            setCombatOutcome: setCombatOutcomeSpy,
            setSanctuaryOutcome: setSanctuaryOutcomeSpy,
            setGameCanceledReason: (reason: GameCanceledReason | null) => {
                gameCanceledReason = reason;
            },
            bumpActionStatsVersion: bumpActionStatsVersionSpy,
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

            setRoundOutcomeSpy = jasmine.createSpy('setRoundOutcome');
            setCombatOutcomeSpy = jasmine.createSpy('setCombatOutcome');
            setSanctuaryOutcomeSpy = jasmine.createSpy('setSanctuaryOutcome');
            setActiveGameSpy = jasmine.createSpy('setActiveGame');
            clearPendingFlagActionRequestSpy = jasmine.createSpy('clearPendingFlagActionRequest').and.callFake(() => {
                hasPendingFlagActionRequest = false;
            });
            handleFlagActionRequestSpy = jasmine.createSpy('handleFlagActionRequest');
            closeFlagActionRequestIfExpiredSpy = jasmine.createSpy('closeFlagActionRequestIfExpired');
            bumpActionStatsVersionSpy = jasmine.createSpy('bumpActionStatsVersion');
        });

        it('handles door toggles including guards for unknown board cells and players', () => {
            const subscriptions = registerActiveGameSocketListeners(context());

            // Nominal case: valid door toggle updates board and acting player.
            emitEvent(SocketEvent.DoorToggled, {
                playerId: 'Alice',
                position: { x: 1, y: 1 },
                cellType: CellType.OpenDoor,
                actionsLeft: 0,
            });

            expect(activeGame?.game.board.cells[1][1]).toBe(CellType.OpenDoor);
            expect(activeGame?.players[0].actionsLeft).toBe(0);
            expect(bumpActionStatsVersionSpy).toHaveBeenCalledTimes(1);
            expect(hasChangedLocation()).toBeTrue();

            // Edge case: unknown player should not bump action stats.
            emitEvent(SocketEvent.DoorToggled, {
                playerId: 'Ghost',
                position: { x: 0, y: 0 },
                cellType: CellType.ClosedDoor,
                actionsLeft: 0,
            });
            expect(activeGame?.game.board.cells[0][0]).toBe(CellType.ClosedDoor);
            expect(bumpActionStatsVersionSpy).toHaveBeenCalledTimes(1);

            // Edge case: out-of-bounds board coordinates are ignored safely.
            emitEvent(SocketEvent.DoorToggled, {
                playerId: 'Alice',
                position: { x: 99, y: 99 },
                cellType: CellType.OpenDoor,
                actionsLeft: 0,
            });
            expect(activeGame?.game.board.cells[0][0]).toBe(CellType.ClosedDoor);

            // Edge case: no active game prevents any state update.
            activeGame = undefined;
            emitEvent(SocketEvent.DoorToggled, {
                playerId: 'Alice',
                position: { x: 1, y: 1 },
                cellType: CellType.ClosedDoor,
                actionsLeft: 0,
            });
            expect(bumpActionStatsVersionSpy).toHaveBeenCalledTimes(1);

            subscriptions.forEach((subscription) => subscription.unsubscribe());
        });

        it('ignores player movement updates when the moved player is unknown', () => {
            const subscriptions = registerActiveGameSocketListeners(context());
            if (!activeGame) {
                fail('Expected active game test fixture to be initialized');
                subscriptions.forEach((subscription) => subscription.unsubscribe());
                return;
            }

            const initialAlicePosition = { ...activeGame.players[0].currentPosition };

            // Edge case: unknown mover payload should not mutate known players.
            emitEvent(SocketEvent.PlayerMoved, {
                playerId: 'Ghost',
                newPosition: { x: 2, y: 2 },
                movementLeft: 0,
            });

            expect(activeGame?.players[0].currentPosition).toEqual(initialAlicePosition);
            expect(hasChangedLocation()).toBeFalse();
            expect(bumpActionStatsVersionSpy).not.toHaveBeenCalled();

            subscriptions.forEach((subscription) => subscription.unsubscribe());
        });

        it('handles combat start and resolve events including no-active-game guards', () => {
            const subscriptions = registerActiveGameSocketListeners(context());
            const refreshedGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Bob', 'game-refresh');
            const combatOutcome: CombatOutcome = {
                updatedActiveGame: refreshedGame,
                winner: null,
                losers: ['Alice'],
                cancelled: false,
            };

            // Nominal case: combat lifecycle updates active game and outcome.
            emitEvent(SocketEvent.CombatStarted, refreshedGame);
            expect(setActiveGameSpy).toHaveBeenCalledWith(refreshedGame);

            emitEvent(SocketEvent.CombatResolved, combatOutcome);
            expect(setCombatOutcomeSpy).toHaveBeenCalledWith(combatOutcome);
            expect(setActiveGameSpy).toHaveBeenCalledWith(refreshedGame);
            expect(hasChangedLocation()).toBeTrue();

            const previousSetActiveGameCalls = setActiveGameSpy.calls.count();
            const previousSetCombatOutcomeCalls = setCombatOutcomeSpy.calls.count();

            // Edge case: without active game, combat events are ignored.
            activeGame = undefined;
            hasChangedLocation.set(false);

            emitEvent(SocketEvent.CombatStarted, refreshedGame);
            emitEvent(SocketEvent.CombatResolved, combatOutcome);

            expect(setActiveGameSpy).toHaveBeenCalledTimes(previousSetActiveGameCalls);
            expect(setCombatOutcomeSpy).toHaveBeenCalledTimes(previousSetCombatOutcomeCalls);
            expect(hasChangedLocation()).toBeFalse();

            subscriptions.forEach((subscription) => subscription.unsubscribe());
        });

        it('applies guard branches for turn start and sanctuary interactions without active game or player', () => {
            const subscriptions = registerActiveGameSocketListeners(context());

            // Edge case: turn start with no active game should not trigger flag expiry checks.
            activeGame = undefined;
            emitEvent(SocketEvent.TurnStarted, {
                player: 'Alice',
                movementLeft: 2,
                actionLeft: 1,
                timeLeft: null,
            });
            expect(closeFlagActionRequestIfExpiredSpy).not.toHaveBeenCalled();

            emitEvent(SocketEvent.SanctuaryInteracted, {
                playerId: 'Alice',
                position: { x: 1, y: 1 },
                itemType: ItemType.LifeSanctuary,
                choice: SanctuaryChoice.Standard,
                succeeded: true,
                actionsLeft: 0,
                currentHealth: 9,
                attackPoints: 4,
                defensePoints: 4,
                sanctuaryActive: false,
                sanctuaryInactiveTurnsRemaining: 1,
                fightSanctuaryUsed: false,
                fightSanctuaryTurnsRemaining: 0,
                fightSanctuaryBonus: 0,
            });

            activeGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Alice');
            // Edge case: unknown sanctuary actor should be ignored.
            emitEvent(SocketEvent.SanctuaryInteracted, {
                playerId: 'Ghost',
                position: { x: 1, y: 1 },
                itemType: ItemType.LifeSanctuary,
                choice: SanctuaryChoice.Standard,
                succeeded: false,
                actionsLeft: 0,
                currentHealth: 9,
                attackPoints: 4,
                defensePoints: 4,
                sanctuaryActive: false,
                sanctuaryInactiveTurnsRemaining: 1,
                fightSanctuaryUsed: false,
                fightSanctuaryTurnsRemaining: 0,
                fightSanctuaryBonus: 0,
            });

            expect(setSanctuaryOutcomeSpy).not.toHaveBeenCalled();
            expect(bumpActionStatsVersionSpy).not.toHaveBeenCalled();
            expect(hasChangedLocation()).toBeFalse();

            subscriptions.forEach((subscription) => subscription.unsubscribe());
        });

        it('maps door and sanctuary interaction errors to toast messages', () => {
            const subscriptions = registerActiveGameSocketListeners(context());

            // Nominal case: domain errors are translated into user-facing toasts.
            const doorError: IErrorResponse = { errorCodes: [ErrorCode.InvalidDoorTarget] };
            const sanctuaryError: IErrorResponse = { errorCodes: [ErrorCode.InvalidSanctuaryTarget] };

            emitEvent(SocketEvent.DoorToggleError, doorError);
            emitEvent(SocketEvent.SanctuaryInteractionError, sanctuaryError);

            expect(toastServiceSpy.show).toHaveBeenCalledWith("La case ciblée n'est pas une porte.");
            expect(toastServiceSpy.show).toHaveBeenCalledWith("La case ciblée n'est pas un sanctuaire.");

            subscriptions.forEach((subscription) => subscription.unsubscribe());
        });

        it('handles combat turn lifecycle and round outcomes', () => {
            const subscriptions = registerActiveGameSocketListeners(context());
            const refreshedGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Bob', 'game-refresh');
            const roundOutcome = createRoundOutcome(refreshedGame);

            // Nominal case: combat turn start resets round outcome and updates snapshot.
            emitEvent(SocketEvent.CombatTurnStart, refreshedGame);
            expect(setRoundOutcomeSpy).toHaveBeenCalledWith(null);
            expect(setActiveGameSpy).toHaveBeenCalledWith(refreshedGame);

            emitEvent(SocketEvent.CombatTurnApplied, roundOutcome);
            expect(setRoundOutcomeSpy).toHaveBeenCalledWith(roundOutcome);

            // Edge case: no active game blocks turn-start updates.
            activeGame = undefined;
            emitEvent(SocketEvent.CombatTurnStart, refreshedGame);
            expect(setActiveGameSpy).toHaveBeenCalledTimes(1);

            subscriptions.forEach((subscription) => subscription.unsubscribe());
        });

        it('updates flag state when picked up with and without matching players', () => {
            activeGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Alice');
            activeGame.game.board.items = [createItem(ItemType.Flag, 1, 1)];
            const subscriptions = registerActiveGameSocketListeners(context());

            // Nominal case: known carrier pickup updates carried flag and requester actions.
            hasPendingFlagActionRequest = true;
            emitEvent(SocketEvent.FlagPickedUp, {
                playerName: 'Bob',
                requesterName: 'Alice',
                requesterActionsLeft: 0,
            });

            expect(activeGame.hasFlagId).toBe('Bob');
            expect(activeGame.game.board.items[0].isCarried).toBeTrue();
            expect(activeGame.players[0].actionsLeft).toBe(0);
            expect(bumpActionStatsVersionSpy).toHaveBeenCalledTimes(1);
            expect(clearPendingFlagActionRequestSpy).toHaveBeenCalled();

            // Edge case: unknown requester should not change requester action points.
            activeGame.players[0].actionsLeft = 1;
            hasPendingFlagActionRequest = true;
            emitEvent(SocketEvent.FlagPickedUp, {
                playerName: 'Bob',
                requesterName: 'Ghost',
                requesterActionsLeft: 0,
            });

            expect(activeGame.players[0].actionsLeft).toBe(1);
            expect(bumpActionStatsVersionSpy).toHaveBeenCalledTimes(1);

            // Edge case: unknown carrier payload keeps hasFlagId unchanged.
            activeGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Alice');
            emitEvent(SocketEvent.FlagPickedUp, {
                playerName: 'Ghost',
            });

            expect(activeGame.hasFlagId).toBe('');

            subscriptions.forEach((subscription) => subscription.unsubscribe());
        });

        it('forwards take/give flag prompts and updates requester actions only when requester exists', () => {
            const subscriptions = registerActiveGameSocketListeners(context());
            const flagActionData: IFlagActionData = {
                gameId: activeGame?._id ?? 'active-game-1',
                currentPlayerName: 'Alice',
                currentPlayerActionsLeft: 0,
                targetPlayerName: 'Bob',
            };

            // Nominal case: known requester updates action points and opens prompt.
            emitEvent(SocketEvent.TakeFlag, flagActionData);
            expect(activeGame?.players[0].actionsLeft).toBe(0);
            expect(bumpActionStatsVersionSpy).toHaveBeenCalledTimes(1);
            expect(handleFlagActionRequestSpy).toHaveBeenCalledWith(flagActionData, SocketEvent.TakeFlag);

            // Edge case: unknown requester still routes prompt without mutating action stats.
            const giveFlagData = {
                ...flagActionData,
                currentPlayerName: 'Ghost',
            };
            emitEvent(SocketEvent.GiveFlag, giveFlagData);

            expect(bumpActionStatsVersionSpy).toHaveBeenCalledTimes(1);
            expect(handleFlagActionRequestSpy).toHaveBeenCalledWith(giveFlagData, SocketEvent.GiveFlag);

            subscriptions.forEach((subscription) => subscription.unsubscribe());
        });

        it('uses default cancellation toast when reason is absent without started game', () => {
            activeGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Alice');
            activeGame.turnOrder = [];
            const subscriptions = registerActiveGameSocketListeners(context());

            // Edge case: waiting-room cancellation uses fallback toast and redirects home.
            emitEvent(SocketEvent.GameCanceled, {});

            expect(localPlayerServiceSpy.clear).toHaveBeenCalled();
            expect(toastServiceSpy.show).toHaveBeenCalledWith("L'organiseur a annulé la partie.");
            expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
            expect(gameCanceledReason).toBeNull();

            subscriptions.forEach((subscription) => subscription.unsubscribe());
        });

        it('uses null cancellation reason fallback when started game is canceled without a reason', () => {
            activeGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Alice');
            const subscriptions = registerActiveGameSocketListeners(context());

            // Edge case: started game cancellation marks game ended without forcing redirect.
            emitEvent(SocketEvent.GameCanceled, {});

            expect(activeGame?.isFinished).toBeTrue();
            expect(activeGame?.winner).toBeNull();
            expect(gameCanceledReason).toBeNull();
            expect(gameHasEnded()).toBeTrue();
            expect(localPlayerServiceSpy.clear).not.toHaveBeenCalled();
            expect(routerSpy.navigate).not.toHaveBeenCalledWith(['/home']);

            subscriptions.forEach((subscription) => subscription.unsubscribe());
        });

        it('applies guard branches for player removal and flag events', () => {
            const subscriptions = registerActiveGameSocketListeners(context());

            // Edge case: no active game ignores kick and flag events.
            activeGame = undefined;
            emitEvent(SocketEvent.PlayerKicked, { playerId: 'Alice' });
            emitEvent(SocketEvent.FlagPickedUp, { playerName: 'Alice' });

            expect(localPlayerServiceSpy.clear).not.toHaveBeenCalled();
            expect(clearPendingFlagActionRequestSpy).not.toHaveBeenCalled();

            activeGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Alice');
            const beforePlayers = activeGame.players.map((player) => player.name);
            emitEvent(SocketEvent.LeftWaitingRoom, { playerId: 'Ghost' });

            expect(activeGame.players.map((player) => player.name)).toEqual(beforePlayers);
            expect(hasChangedLocation()).toBeFalse();

            hasPendingFlagActionRequest = false;
            // Edge case: rejection without pending request should not toast or clear again.
            emitEvent(SocketEvent.FlagTransferRejected, {
                gameId: activeGame._id,
                requesterName: 'Alice',
                targetPlayerName: 'Bob',
            });

            expect(clearPendingFlagActionRequestSpy).not.toHaveBeenCalled();
            expect(toastServiceSpy.show).not.toHaveBeenCalledWith('Le transfert du drapeau a été refusé.');

            subscriptions.forEach((subscription) => subscription.unsubscribe());
        });

        it('does not toast on flag transfer rejection when local player is not requester', () => {
            const subscriptions = registerActiveGameSocketListeners(context());
            hasPendingFlagActionRequest = true;
            localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Bob'));

            // Edge case: non-requester local player should not receive rejection toast.
            emitEvent(SocketEvent.FlagTransferRejected, {
                gameId: activeGame?._id ?? 'active-game-1',
                requesterName: 'Alice',
                targetPlayerName: 'Bob',
            });

            expect(clearPendingFlagActionRequestSpy).toHaveBeenCalled();
            expect(toastServiceSpy.show).not.toHaveBeenCalledWith('Le transfert du drapeau a été refusé.');

            subscriptions.forEach((subscription) => subscription.unsubscribe());
        });

        it('returns unsubscribable subscriptions for all listeners', () => {
            const subscriptions = registerActiveGameSocketListeners(context());

            // Nominal case: each registered listener should provide a valid subscription.
            expect(subscriptions.length).toBeGreaterThan(MIN_LISTENER_COUNT);
            for (const subscription of subscriptions) {
                expect(subscription.closed).toBeFalse();
                subscription.unsubscribe();
                expect(subscription.closed).toBeTrue();
            }
        });
    });

    function createItem(itemType: ItemType, x: number, y: number): IItem {
        return {
            itemType,
            x,
            y,
            size: 1,
            isCarried: false,
        };
    }

    function createRoundOutcome(updatedActiveGame: IActiveGame): CombatTurnOutcome {
        return {
            updatedActiveGame,
            attackerStats: createEmptyStats(),
            defenderStats: createEmptyStats(),
            attackerDealtDamage: 1,
            defenderDealtDamage: 0,
            attackerReceivedDamage: 0,
            defenderReceivedDamage: 1,
        };
    }

    function createEmptyStats() {
        return {
            baseAttackPoints: 0,
            baseDefensePoints: 0,
            attackDiceBonus: 0,
            defenseDiceBonus: 0,
            postureAttackBonus: 0,
            postureDefenseBonus: 0,
            attackFightSanctuaryBonus: 0,
            defenseFightSanctuaryBonus: 0,
            attackIceMalus: 0,
            defenseIceMalus: 0,
            totalAttackPoints: 0,
            totalDefensePoints: 0,
        };
    }
})();
