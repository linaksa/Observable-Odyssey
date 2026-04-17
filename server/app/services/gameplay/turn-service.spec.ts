/* eslint-disable max-lines -- TurnService and virtual-turn finalization paths need many timer/state branches in a single integrated suite. */
/**
 * Testing strategy — TurnService and VirtualPlayerTurnFinalizerService
 *
 * Approach:
 * - Validate turn lifecycle methods (start, begin, end, suspend, continue, combat timers) with fake timers and stubbed socket/persistence/log dependencies.
 * - Cover virtual-player finalization integration through the TypeDI-wired VirtualPlayerTurnFinalizerService section in this file.
 *
 * Edge cases covered:
 * - Missing or finished games, missing combat state, and missing current-player fallbacks during resumed turns.
 * - Sanctuary cooldown advancement/reactivation and fight-buff decrement behavior across turn transitions.
 * - Finalizer no-op and cancellation branches when virtual turn ownership changes or combat is still active.
 */
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { ActiveGameGarbageCollectorService } from '@app/services/active-game/active-game-garbage-collector.service';
import { EndGameService } from '@app/services/gameplay/end-game.service';
import { SanctuaryService } from '@app/services/gameplay/sanctuary-service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { GameplayLogService } from '@app/services/realtime/gameplay-log.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { VirtualPlayerTurnFinalizerService } from '@app/services/virtual-player/virtual-player-turn-finalizer.service';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { VirtualPlayerProfile } from '@common/character';
import { Avatar, DiceType, SANCTUARY_COOLDOWN_TURN_STEPS, TURN_TIME_MS } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { ItemType } from '@common/items';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Container } from 'typedi';

const SANCTUARY_BUFFED_STAT = 5;
const ONE_SECOND_MS = 1000;
const CONTINUE_TURN_MISSING_GAME_MS = 5000;
const CONTINUE_TURN_DURATION_MS = 3000;
const CONTINUE_TURN_FALLBACK_DURATION_MS = 1500;
const COMBAT_TIMER_DURATION_MS = 2000;

describe('TurnService', () => {
    let turnService: TurnService;
    let activeGameService: {
        getActiveGameById: sinon.SinonStub;
        saveActiveGameById: sinon.SinonStub;
    };
    let socketService: {
        getNamespace: sinon.SinonStub;
    };
    let namespaceSpy: {
        to: sinon.SinonStub;
    };
    let emitSpy: sinon.SinonStub;
    let sanctuaryService: SanctuaryService;
    let gameplayLogService: {
        emitGameLogToRoom: sinon.SinonStub;
    };

    beforeEach(() => {
        activeGameService = {
            getActiveGameById: sinon.stub(),
            saveActiveGameById: sinon.stub().resolves(),
        };
        emitSpy = sinon.stub();
        namespaceSpy = {
            to: sinon.stub().returns({
                emit: emitSpy,
            }),
        };
        socketService = {
            getNamespace: sinon.stub().returns(namespaceSpy),
        };
        sanctuaryService = new SanctuaryService(activeGameService as unknown as ActiveGameService);
        gameplayLogService = {
            emitGameLogToRoom: sinon.stub(),
        };

        turnService = new TurnService(
            socketService as unknown as SocketService,
            activeGameService as unknown as ActiveGameService,
            sanctuaryService as unknown as SanctuaryService,
            gameplayLogService as unknown as GameplayLogService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should reduce fight sanctuary duration when a player ends their turn', async () => {
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);
        const onTurnEndedSpy = sinon.spy(sanctuaryService, 'onTurnEnded');
        const startTurnStub = sinon.stub(turnService, 'startTurn').resolves();

        await turnService.endTurn(activeGame._id);

        expect(onTurnEndedSpy.calledOnceWithExactly(activeGame, 'Alice')).to.equal(true);
        expect(activeGame.players[0].fightSanctuaryTurnsRemaining).to.equal(1);
        expect(activeGame.players[0].attackPoints).to.equal(SANCTUARY_BUFFED_STAT);
        expect(activeGame.players[0].defensePoints).to.equal(SANCTUARY_BUFFED_STAT);
        expect(activeGameService.saveActiveGameById.calledOnceWithExactly(activeGame._id, activeGame)).to.equal(true);
        expect(socketService.getNamespace.calledOnceWithExactly(Namespaces.Game)).to.equal(true);
        expect(namespaceSpy.to.calledOnceWithExactly(activeGame._id)).to.equal(true);
        expect(emitSpy.calledOnceWithExactly(SocketEvent.PlayersUpdated, activeGame.players)).to.equal(true);
        expect(startTurnStub.calledOnceWithExactly(activeGame._id)).to.equal(true);
    });

    it('should invoke the turn-ended handler before starting the next turn', async () => {
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);
        const startTurnStub = sinon.stub(turnService, 'startTurn').resolves();
        const turnEndedHandler = sinon.stub().resolves();
        turnService.setTurnEndedHandler(turnEndedHandler);

        await turnService.endTurn(activeGame._id);

        expect(turnEndedHandler.calledOnceWithExactly(activeGame._id)).to.equal(true);
        expect(turnEndedHandler.calledBefore(startTurnStub)).to.equal(true);
    });

    it('should advance sanctuary cooldowns when a turn starts', async () => {
        const activeGame = createActiveGame();
        activeGame.game.board.items = [
            {
                itemType: ItemType.LifeSanctuary,
                x: 0,
                y: 0,
                size: 4,
                active: false,
                inactiveTurnsRemaining: SANCTUARY_COOLDOWN_TURN_STEPS,
            },
        ];
        activeGameService.getActiveGameById.resolves(activeGame);
        const onTurnStartedSpy = sinon.spy(sanctuaryService, 'onTurnStarted');
        const clock = sinon.useFakeTimers();

        try {
            await turnService.startTurn(activeGame._id);

            expect(onTurnStartedSpy.calledOnceWithExactly(activeGame)).to.equal(true);
            expect(activeGame.turnIsInPreparation).to.equal(true);
            expect(activeGame.game.board.items[0].active).to.equal(false);
            expect(activeGame.game.board.items[0].inactiveTurnsRemaining).to.equal(SANCTUARY_COOLDOWN_TURN_STEPS - 1);
            expect(activeGameService.saveActiveGameById.calledOnceWithExactly(activeGame._id, activeGame)).to.equal(true);
            expect(socketService.getNamespace.calledOnceWithExactly(Namespaces.Game)).to.equal(true);
            expect(namespaceSpy.to.calledOnceWithExactly(activeGame._id)).to.equal(true);
            expect(emitSpy.calledOnceWithExactly(SocketEvent.TurnPreparing, { player: 'Alice' })).to.equal(true);
        } finally {
            clock.restore();
        }
    });

    it('should reactivate a sanctuary when its cooldown expires', async () => {
        const activeGame = createActiveGame();
        activeGame.game.board.items = [
            {
                itemType: ItemType.LifeSanctuary,
                x: 0,
                y: 0,
                size: 4,
                active: false,
                inactiveTurnsRemaining: 1,
            },
        ];
        activeGameService.getActiveGameById.resolves(activeGame);
        const onTurnStartedSpy = sinon.spy(sanctuaryService, 'onTurnStarted');
        const clock = sinon.useFakeTimers();

        try {
            await turnService.startTurn(activeGame._id);

            expect(onTurnStartedSpy.calledOnceWithExactly(activeGame)).to.equal(true);
            expect(activeGame.game.board.items[0].active).to.equal(true);
            expect(activeGame.game.board.items[0].inactiveTurnsRemaining).to.equal(0);
        } finally {
            clock.restore();
        }
    });

    it('should return early when suspendTurn cannot find an active game or attack', async () => {
        // Edge case: missing game.
        activeGameService.getActiveGameById.resolves(null);
        await turnService.suspendTurn('missing-game');
        expect(activeGameService.saveActiveGameById.called).to.equal(false);

        // Edge case: game exists but no active combat.
        const activeGame = createActiveGame();
        activeGame.currentAttack = null;
        activeGameService.getActiveGameById.resolves(activeGame);
        await turnService.suspendTurn(activeGame._id);
        expect(activeGameService.saveActiveGameById.called).to.equal(false);
    });

    it('should suspend the turn timer and persist remaining combat turn time', async () => {
        const activeGame = createActiveGame();
        activeGame.currentAttack = {
            attacker: 'Alice',
            defender: 'Bob',
            attackerPosture: null,
            defenderPosture: null,
            turnCount: 1,
            suspendedTurnTimer: 0,
        };
        activeGame.turnStartTimeStamp = Date.now() - ONE_SECOND_MS;
        activeGameService.getActiveGameById.resolves(activeGame);

        const timer = setTimeout(() => undefined, TURN_TIME_MS);
        (turnService as unknown as { turnTimers: Map<string, NodeJS.Timeout> }).turnTimers.set(activeGame._id, timer);

        await turnService.suspendTurn(activeGame._id);

        expect(activeGame.currentAttack.suspendedTurnTimer).to.be.greaterThan(0);
        expect(activeGameService.saveActiveGameById.calledOnceWithExactly(activeGame._id, activeGame)).to.equal(true);
    });

    it('should return early when continueTurn cannot find an active game', async () => {
        activeGameService.getActiveGameById.resolves(null);
        await turnService.continueTurn('missing-game', CONTINUE_TURN_MISSING_GAME_MS);
        expect(namespaceSpy.to.called).to.equal(false);
    });

    it('should emit TurnStarted payload and end turn when continue timer expires', async () => {
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);
        const endTurnStub = sinon.stub(turnService, 'endTurn').resolves();
        const clock = sinon.useFakeTimers();

        try {
            await turnService.continueTurn(activeGame._id, CONTINUE_TURN_DURATION_MS);

            // Nominal case: resumed turn state is emitted with remaining time.
            expect(namespaceSpy.to.calledOnceWithExactly(activeGame._id)).to.equal(true);
            expect(
                emitSpy.calledOnceWithExactly(SocketEvent.TurnStarted, {
                    player: 'Alice',
                    movementLeft: activeGame.players[0].movementLeft,
                    actionLeft: activeGame.players[0].actionsLeft,
                    timeLeft: CONTINUE_TURN_DURATION_MS,
                }),
            ).to.equal(true);

            // Edge case: timer expiry auto-ends the resumed turn.
            await clock.tickAsync(CONTINUE_TURN_DURATION_MS);
            expect(endTurnStub.calledOnceWithExactly(activeGame._id)).to.equal(true);
        } finally {
            clock.restore();
        }
    });

    it('should emit fallback payload values when no current player exists on continueTurn', async () => {
        const activeGame = createActiveGame();
        activeGame.currentPlayerIndex = 10;
        activeGameService.getActiveGameById.resolves(activeGame);

        await turnService.continueTurn(activeGame._id, CONTINUE_TURN_FALLBACK_DURATION_MS);

        expect(
            emitSpy.calledOnceWithExactly(SocketEvent.TurnStarted, {
                player: undefined,
                movementLeft: 0,
                actionLeft: 0,
                timeLeft: CONTINUE_TURN_FALLBACK_DURATION_MS,
            }),
        ).to.equal(true);
    });

    it('should start and clear combat timers correctly', () => {
        const activeGame = createActiveGame();
        const callbackSpy = sinon.spy();
        const clock = sinon.useFakeTimers();

        try {
            const oldTimer = setTimeout(() => undefined, ONE_SECOND_MS);
            (turnService as unknown as { combatTimers: Map<string, NodeJS.Timeout> }).combatTimers.set(activeGame._id, oldTimer);

            turnService.startCombatTimer(COMBAT_TIMER_DURATION_MS, activeGame, callbackSpy);
            expect((turnService as unknown as { combatTimers: Map<string, NodeJS.Timeout> }).combatTimers.has(activeGame._id)).to.equal(true);

            clock.tick(COMBAT_TIMER_DURATION_MS);
            expect(callbackSpy.calledOnce).to.equal(true);

            const nextTimer = setTimeout(() => undefined, ONE_SECOND_MS);
            (turnService as unknown as { combatTimers: Map<string, NodeJS.Timeout> }).combatTimers.set(activeGame._id, nextTimer);
            turnService.clearCombatTimer(activeGame);
            expect((turnService as unknown as { combatTimers: Map<string, NodeJS.Timeout> }).combatTimers.has(activeGame._id)).to.equal(false);
        } finally {
            clock.restore();
        }
    });

    it('should return 0 when clearing a timer that does not exist', () => {
        const activeGame = createActiveGame();
        const clearTimerFromMap = (
            turnService as unknown as {
                clearTimerFromMap: (game: IActiveGame, map: Map<string, NodeJS.Timeout>) => number;
            }
        ).clearTimerFromMap;
        const value = clearTimerFromMap(activeGame, new Map());
        expect(value).to.equal(0);
    });

    it('returns early when startTurn cannot find an active game', async () => {
        activeGameService.getActiveGameById.resolves(null);

        await turnService.startTurn('missing-game');

        expect(activeGameService.saveActiveGameById.called).to.equal(false);
        expect(namespaceSpy.to.called).to.equal(false);
    });

    it('returns early when startTurn sees a finished game', async () => {
        const activeGame = createActiveGame();
        activeGame.isFinished = true;
        activeGameService.getActiveGameById.resolves(activeGame);

        await turnService.startTurn(activeGame._id);

        expect(activeGameService.saveActiveGameById.called).to.equal(false);
        expect(namespaceSpy.to.called).to.equal(false);
    });

    it('skips abandoned scheduled player during startTurn', async () => {
        const activeGame = createActiveGame();
        activeGame.players[0].hasAbandoned = true;
        activeGameService.getActiveGameById.resolves(activeGame);
        const endTurnStub = sinon.stub(turnService, 'endTurn').resolves();

        await turnService.startTurn(activeGame._id);

        expect(endTurnStub.calledOnceWithExactly(activeGame._id)).to.equal(true);
    });

    it('returns after preparation persistence when no current player can be resolved', async () => {
        const activeGame = createActiveGame();
        activeGame.turnOrder = [];
        activeGameService.getActiveGameById.resolves(activeGame);

        await turnService.startTurn(activeGame._id);

        // Edge case: turn setup persists preparation state but emits no socket events without a player.
        expect(activeGameService.saveActiveGameById.calledOnceWithExactly(activeGame._id, activeGame)).to.equal(true);
        expect(namespaceSpy.to.called).to.equal(false);
    });

    it('stops startTurn when the game becomes finished during preparation', async () => {
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);
        sinon.stub(sanctuaryService, 'onTurnStarted').callsFake((game) => {
            game.isFinished = true;
        });

        await turnService.startTurn(activeGame._id);

        // Edge case: a game finishing mid-preparation aborts turn scheduling.
        expect(activeGameService.saveActiveGameById.calledOnceWithExactly(activeGame._id, activeGame)).to.equal(true);
        expect(namespaceSpy.to.called).to.equal(false);
    });

    it('calls beginTurn after the preparation timer expires', async () => {
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);
        const beginTurnStub = sinon.stub(turnService as unknown as { beginTurn: (gameId: string) => Promise<void> }, 'beginTurn').resolves();
        const clock = sinon.useFakeTimers();

        try {
            await turnService.startTurn(activeGame._id);
            await clock.tickAsync(CONTINUE_TURN_DURATION_MS);
            expect(beginTurnStub.calledOnceWithExactly(activeGame._id)).to.equal(true);
        } finally {
            clock.restore();
        }
    });

    it('returns early when beginTurn cannot find game or game is finished', async () => {
        const privateService = turnService as unknown as { beginTurn: (gameId: string) => Promise<void> };
        activeGameService.getActiveGameById.onFirstCall().resolves(null);
        await privateService.beginTurn('missing-game');

        const activeGame = createActiveGame();
        activeGame.isFinished = true;
        activeGameService.getActiveGameById.onSecondCall().resolves(activeGame);
        await privateService.beginTurn(activeGame._id);

        expect(namespaceSpy.to.called).to.equal(false);
    });

    it('returns after beginTurn persistence when no current player can be resolved', async () => {
        const activeGame = createActiveGame();
        activeGame.turnOrder = [];
        activeGameService.getActiveGameById.resolves(activeGame);

        await (turnService as unknown as { beginTurn: (gameId: string) => Promise<void> }).beginTurn(activeGame._id);

        // Edge case: beginTurn exits before socket emission when current player is missing.
        expect(activeGameService.saveActiveGameById.calledOnceWithExactly(activeGame._id, activeGame)).to.equal(true);
        expect(namespaceSpy.to.called).to.equal(false);
    });

    it('emits fallback values and auto-ends turn when beginTurn timer expires', async () => {
        const activeGame = createActiveGame();
        activeGame.players[0].movementLeft = undefined as unknown as number;
        activeGame.players[0].actionsLeft = undefined as unknown as number;
        activeGameService.getActiveGameById.resolves(activeGame);
        const endTurnStub = sinon.stub(turnService, 'endTurn').resolves();
        const clock = sinon.useFakeTimers();

        try {
            await (turnService as unknown as { beginTurn: (gameId: string) => Promise<void> }).beginTurn(activeGame._id);

            // Nominal case: nullish movement/action values are emitted as zero.
            expect(
                emitSpy.calledWithExactly(SocketEvent.TurnStarted, {
                    player: 'Alice',
                    movementLeft: 0,
                    actionLeft: 0,
                    timeLeft: null,
                }),
            ).to.equal(true);

            // Edge case: beginTurn timer expiration triggers automatic endTurn.
            await clock.tickAsync(TURN_TIME_MS);
            expect(endTurnStub.calledOnceWithExactly(activeGame._id)).to.equal(true);
        } finally {
            clock.restore();
        }
    });

    it('runs virtual player handler when beginTurn starts a virtual player turn', async () => {
        const activeGame = createActiveGame();
        activeGame.players[0].virtualPlayerProfile = VirtualPlayerProfile.Agressive;
        activeGameService.getActiveGameById.resolves(activeGame);
        const virtualHandler = sinon.stub().resolves();
        turnService.setVirtualPlayerTurnHandler(virtualHandler);

        await (turnService as unknown as { beginTurn: (gameId: string) => Promise<void> }).beginTurn(activeGame._id);

        expect(virtualHandler.calledOnceWithExactly(activeGame.players[0], activeGame)).to.equal(true);
        expect(gameplayLogService.emitGameLogToRoom.calledOnceWithExactly(activeGame._id, 'Début du tour de Alice.')).to.equal(true);
    });

    it('returns early from endTurn when game is missing or already finished', async () => {
        activeGameService.getActiveGameById.onFirstCall().resolves(null);
        await turnService.endTurn('missing-game');

        const finishedGame = createActiveGame();
        finishedGame.isFinished = true;
        activeGameService.getActiveGameById.onSecondCall().resolves(finishedGame);
        await turnService.endTurn(finishedGame._id);

        expect(activeGameService.saveActiveGameById.called).to.equal(false);
    });
});

describe('VirtualPlayerTurnFinalizerService', () => {
    let activeGameService: { getActiveGameById: sinon.SinonStub };
    let activeGameGarbageCollectorService: { reevaluateFinishedGameMark: sinon.SinonStub };
    let endGameService: { checkEndGame: sinon.SinonStub; getEndGameLogMessage: sinon.SinonStub };
    let gameplayLogService: { emitGameLogToRoom: sinon.SinonStub };
    let socketService: { getNamespace: sinon.SinonStub };
    let turnService: { endTurn: sinon.SinonStub };
    let namespaceSpy: { to: sinon.SinonStub };
    let emitSpy: sinon.SinonStub;
    let service: VirtualPlayerTurnFinalizerService;

    beforeEach(() => {
        Container.reset();
        activeGameService = { getActiveGameById: sinon.stub() };
        activeGameGarbageCollectorService = { reevaluateFinishedGameMark: sinon.stub().resolves() };
        endGameService = {
            checkEndGame: sinon.stub().resolves({ hasEnded: false, winner: null, reason: null, remainingPlayers: [] }),
            getEndGameLogMessage: sinon.stub().returns('Fin de partie.'),
        };
        gameplayLogService = { emitGameLogToRoom: sinon.stub() };
        emitSpy = sinon.stub();
        namespaceSpy = {
            to: sinon.stub().returns({ emit: emitSpy }),
        };
        socketService = { getNamespace: sinon.stub().returns(namespaceSpy) };
        turnService = { endTurn: sinon.stub().resolves() };
        Container.set(ActiveGameGarbageCollectorService, activeGameGarbageCollectorService as unknown as ActiveGameGarbageCollectorService);

        service = new VirtualPlayerTurnFinalizerService(
            endGameService as unknown as EndGameService,
            activeGameService as unknown as ActiveGameService,
            socketService as unknown as SocketService,
            turnService as unknown as TurnService,
            gameplayLogService as unknown as GameplayLogService,
        );
    });

    afterEach(() => {
        sinon.restore();
        Container.reset();
    });

    it('should end the turn when the virtual player is still active', async () => {
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);

        service.beginTurn(activeGame._id, 'Alice');

        await service.finalizeTurn(activeGame._id);

        expect(endGameService.checkEndGame.calledOnceWithExactly(activeGame._id)).to.equal(true);
        expect(turnService.endTurn.calledOnceWithExactly(activeGame._id)).to.equal(true);
    });

    it('should not end the turn when another player already became active', async () => {
        const activeGame = createActiveGame();
        activeGame.currentPlayerIndex = 1;
        activeGameService.getActiveGameById.resolves(activeGame);

        service.beginTurn(activeGame._id, 'Alice');

        await service.finalizeTurn(activeGame._id);

        expect(endGameService.checkEndGame.calledOnceWithExactly(activeGame._id)).to.equal(true);
        expect(turnService.endTurn.called).to.equal(false);
        expect(socketService.getNamespace.called).to.equal(false);
        expect(service.isTurnInProgress(activeGame._id)).to.equal(true);
    });

    it('should reevaluate the GC mark when virtual-player finalization ends the game', async () => {
        const activeGame = createActiveGame();
        endGameService.checkEndGame.resolves({ hasEnded: true, winner: 'Alice', reason: null, remainingPlayers: ['Alice'] });
        activeGameService.getActiveGameById.onFirstCall().resolves({ ...activeGame, winner: 'Alice' });
        activeGameService.getActiveGameById.onSecondCall().resolves(activeGame);

        service.beginTurn(activeGame._id, 'Alice');

        await service.finalizeTurn(activeGame._id);

        expect(activeGameGarbageCollectorService.reevaluateFinishedGameMark.calledOnceWithExactly(activeGame._id)).to.equal(true);
    });
});

function createActiveGame(): IActiveGame {
    return {
        _id: 'active-game-1',
        game: {
            gameTitle: 'Turn game',
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
        },
        players: [
            {
                name: 'Alice',
                avatar: Avatar.Avatar1,
                initialHealth: 6,
                currentHealth: 6,
                attackBonusDiceType: DiceType.FourSided,
                defenseBonusDiceType: DiceType.SixSided,
                rapidityPoints: 4,
                attackPoints: 5,
                defensePoints: 5,
                actionsLeft: 1,
                movementLeft: 4,
                victories: 0,
                hasAbandoned: false,
                startingPosition: { x: 0, y: 0 },
                currentPosition: { x: 0, y: 0 },
                fightSanctuaryUsed: true,
                fightSanctuaryTurnsRemaining: 2,
                fightSanctuaryBonus: 1,

                nCombats: 0,
                nVictories: 0,
                nDefeats: 0,
                totalDamageDealt: 0,
                totalDamageReceived: 0,
                visitedCells: [] as string[],
            },
            {
                name: 'Bob',
                avatar: Avatar.Avatar2,
                initialHealth: 6,
                currentHealth: 6,
                attackBonusDiceType: DiceType.FourSided,
                defenseBonusDiceType: DiceType.SixSided,
                rapidityPoints: 4,
                attackPoints: 4,
                defensePoints: 4,
                actionsLeft: 1,
                movementLeft: 4,
                victories: 0,
                hasAbandoned: false,
                startingPosition: { x: 1, y: 0 },
                currentPosition: { x: 1, y: 0 },

                nCombats: 0,
                nVictories: 0,
                nDefeats: 0,
                totalDamageDealt: 0,
                totalDamageReceived: 0,
                visitedCells: [] as string[],
            },
        ],
        currentPlayerIndex: 0,
        turnOrder: ['Alice', 'Bob'],
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Organizer',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        turnStartTimeStamp: 0,
        currentAttack: null,
        hasFlagId: '',
    };
}
