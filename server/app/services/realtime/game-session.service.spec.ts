/* eslint-disable max-lines -- GameSessionService covers many disconnect/abandon/combat branches that are clearer in one end-to-end suite. */
/**
 * Testing strategy — GameSessionService
 *
 * Approach:
 * - Exercise disconnect, abandon, and join helper paths with focused active-game fixtures.
 * - Assert downstream combat/end-game/turn services receive the expected payloads and room emissions.
 *
 * Edge cases covered:
 * - Combat cleanup skips end-turn checks when the attacker abandons during disconnect resolution.
 * - Missing socket mappings, players, or active games short-circuit without side effects.
 * - Disconnect helpers still clear socket-room mappings when player metadata is absent.
 * - Disconnect loops skip game ids that no longer resolve to an active game.
 * - Finished-game GC reevaluation is triggered after abandon, disconnect, and waiting-room leave flows.
 */
import { ActiveGameListSocketsService } from '@app/services/active-game/active-game-list-sockets.service';
import { ActiveGameGarbageCollectorService } from '@app/services/active-game/active-game-garbage-collector.service';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { CombatService } from '@app/services/gameplay/combat-service';
import { EndGameService } from '@app/services/gameplay/end-game.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { GameSessionService } from '@app/services/realtime/game-session.service';
import { GameplayActionService } from '@app/services/realtime/gameplay-action.service';
import { IActiveGame, ICurrentAttack } from '@common/active-game';
import { CombatOutcome } from '@common/attack-result';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { SocketEvent } from '@common/socket-events';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Namespace } from 'socket.io';
import { Container } from 'typedi';

const GAME_ONE = 'game-1';
const GAME_TWO = 'game-2';
const TARGET_GAME = 'target-game';
const OTHER_GAME = 'other-game';
const THIRD_GAME = 'third-game';
const ACTIVE_GAME = 'active-game';
const WAITING_GAME = 'waiting-game';

describe('GameSessionService', () => {
    let service: GameSessionService;
    let activeGameService: {
        getActiveGameById: sinon.SinonStub;
        saveActiveGameById: sinon.SinonStub;
        removePlayer: sinon.SinonStub;
        deleteGameById: sinon.SinonStub;
    };
    let combatService: {
        cancelCombat: sinon.SinonStub;
    };
    let endGameService: {
        handlePlayerAbandon: sinon.SinonStub;
        checkEndGame: sinon.SinonStub;
        checkIfOrganizer: sinon.SinonStub;
        getEndGameLogMessage: sinon.SinonStub;
    };
    let turnService: {
        endTurn: sinon.SinonStub;
    };
    let activeGameListSocketsService: {
        emitJoinableGamesUpdated: sinon.SinonStub;
    };
    let activeGameGarbageCollectorService: {
        reevaluateFinishedGameMark: sinon.SinonStub;
    };
    let gameplayActionService: {
        checkEndTurnIfNoMovesLeft: sinon.SinonStub;
    };
    let namespace: Namespace;
    let namespaceEmitStub: sinon.SinonStub;

    beforeEach(() => {
        Container.reset();
        activeGameService = {
            getActiveGameById: sinon.stub(),
            saveActiveGameById: sinon.stub().resolves(),
            removePlayer: sinon.stub().resolves(),
            deleteGameById: sinon.stub().resolves(),
        };
        combatService = {
            cancelCombat: sinon.stub(),
        };
        endGameService = {
            handlePlayerAbandon: sinon.stub().resolves(),
            checkEndGame: sinon.stub().resolves({ hasEnded: false, winner: null, reason: null, completionType: null, remainingPlayers: [] }),
            checkIfOrganizer: sinon.stub().resolves(false),
            getEndGameLogMessage: sinon.stub().returns('Fin de partie: test. Joueurs restants: Alice.'),
        };
        turnService = {
            endTurn: sinon.stub().resolves(),
        };
        activeGameListSocketsService = {
            emitJoinableGamesUpdated: sinon.stub(),
        };
        activeGameGarbageCollectorService = {
            reevaluateFinishedGameMark: sinon.stub().resolves(),
        };
        gameplayActionService = {
            checkEndTurnIfNoMovesLeft: sinon.stub().resolves(),
        };
        Container.set(GameplayActionService, gameplayActionService as unknown as GameplayActionService);
        Container.set(ActiveGameGarbageCollectorService, activeGameGarbageCollectorService as unknown as ActiveGameGarbageCollectorService);

        service = new GameSessionService(
            activeGameService as unknown as ActiveGameService,
            combatService as unknown as CombatService,
            endGameService as unknown as EndGameService,
            turnService as unknown as TurnService,
            activeGameListSocketsService as unknown as ActiveGameListSocketsService,
        );

        namespaceEmitStub = sinon.stub();
        namespace = {
            to: sinon.stub().returns({ emit: namespaceEmitStub }),
        } as unknown as Namespace;
    });

    afterEach(() => {
        sinon.restore();
        Container.reset();
    });

    // Edge case: attacker disconnect cleanup should not run end-turn checks for a player who already abandoned.
    it('skips the end-turn check when the attacker abandons during combat cleanup', async () => {
        const activeGame = createActiveGame(['Alice', 'Bob'], 1, createCurrentAttack('Alice', 'Bob'));
        const refreshedGame = createActiveGame(['Bob'], 0, null, ['Alice']);
        const combatOutcome = createCombatOutcome(refreshedGame);

        activeGameService.getActiveGameById.onFirstCall().resolves(activeGame);
        activeGameService.getActiveGameById.onSecondCall().resolves(refreshedGame);
        combatService.cancelCombat.resolves(combatOutcome);

        await service.handleActiveGameDisconnect(activeGame._id, 'Alice', namespace, sinon.stub());

        expect(combatService.cancelCombat.calledOnceWithExactly(activeGame, 'Alice')).to.equal(true);
        expect(gameplayActionService.checkEndTurnIfNoMovesLeft.called).to.equal(false);
        expect(namespaceEmitStub.calledWithExactly(SocketEvent.CombatResolved, combatOutcome)).to.equal(true);
    });

    // Nominal case: defender disconnect keeps attacker eligible for end-turn verification.
    it('keeps the end-turn check for the surviving attacker after the defender disconnects', async () => {
        const activeGame = createActiveGame(['Alice', 'Bob'], 0, createCurrentAttack('Alice', 'Bob'));
        const refreshedGame = createActiveGame(['Alice', 'Bob'], 0, null, ['Bob']);
        const combatOutcome = createCombatOutcome(refreshedGame);

        activeGameService.getActiveGameById.onFirstCall().resolves(activeGame);
        activeGameService.getActiveGameById.onSecondCall().resolves(refreshedGame);
        combatService.cancelCombat.resolves(combatOutcome);

        await service.handleActiveGameDisconnect(activeGame._id, 'Bob', namespace, sinon.stub());

        expect(combatService.cancelCombat.calledOnceWithExactly(activeGame, 'Bob')).to.equal(true);
        expect(gameplayActionService.checkEndTurnIfNoMovesLeft.calledOnceWithExactly(activeGame._id, 'Alice')).to.equal(true);
        expect(namespaceEmitStub.calledWithExactly(SocketEvent.CombatResolved, combatOutcome)).to.equal(true);
    });

    it('ends the turn when the current player disconnects from an active game — Edge case', async () => {
        const activeGame = createActiveGame(['Alice', 'Bob'], 0, null);
        const refreshedGame = createActiveGame(['Alice', 'Bob'], 0, null, ['Bob']);

        activeGameService.getActiveGameById.onFirstCall().resolves(activeGame);
        activeGameService.getActiveGameById.onSecondCall().resolves(refreshedGame);

        await service.handleActiveGameDisconnect(activeGame._id, 'Alice', namespace, sinon.stub());

        expect(turnService.endTurn.calledOnceWithExactly(activeGame._id)).to.equal(true);
    });

    it('logs cancellation reason and remaining players when disconnect cancels the game', async () => {
        const activeGame = createActiveGame(['Alice', 'Bob'], 0, null);
        const refreshedGame = createActiveGame(['Alice', 'Bob'], 0, null, ['Bob']);
        const emitGameLog = sinon.stub();

        activeGameService.getActiveGameById.onFirstCall().resolves(activeGame);
        activeGameService.getActiveGameById.onSecondCall().resolves(refreshedGame);
        endGameService.checkEndGame.resolves({
            hasEnded: true,
            winner: null,
            reason: 'insufficient-active-players',
            completionType: 'canceled',
            remainingPlayers: ['Alice'],
        });

        await service.handleActiveGameDisconnect(activeGame._id, 'Bob', namespace, emitGameLog);

        expect(endGameService.getEndGameLogMessage.calledOnce).to.equal(true);
        expect(emitGameLog.calledWithExactly(activeGame._id, 'Fin de partie: test. Joueurs restants: Alice.')).to.equal(true);
        expect(namespaceEmitStub.calledWithExactly(SocketEvent.GameCanceled, { reason: 'insufficient-active-players' })).to.equal(true);
    });

    it('emits GameEnded when disconnect reaches a victory condition', async () => {
        const activeGame = createActiveGame(['Alice', 'Bob'], 0, null);
        const refreshedGame = createActiveGame(['Alice', 'Bob'], 0, null, ['Bob']);

        activeGameService.getActiveGameById.onFirstCall().resolves(activeGame);
        activeGameService.getActiveGameById.onSecondCall().resolves(refreshedGame);
        endGameService.checkEndGame.resolves({
            hasEnded: true,
            winner: 'Alice',
            reason: 'combat-victories',
            completionType: 'victory',
            remainingPlayers: ['Alice'],
        });

        await service.handleActiveGameDisconnect(activeGame._id, 'Bob', namespace, sinon.stub());

        expect(namespaceEmitStub.calledWithExactly(SocketEvent.GameEnded, { winner: 'Alice' })).to.equal(true);
        expect(activeGameGarbageCollectorService.reevaluateFinishedGameMark.calledOnceWithExactly(activeGame._id)).to.equal(true);
    });

    it('reevaluates finished-game GC mark when a player explicitly abandons', async () => {
        const handleActiveGameDisconnectStub = sinon.stub(service, 'handleActiveGameDisconnect').resolves();
        const gameId = 'active-game-1';
        const socket = {
            id: 'socket-1',
            leave: sinon.stub(),
            data: {
                playerNamesByGameId: { [gameId]: 'Alice' },
            },
        };

        await service.handlePlayerAbandon({ gameId, playerId: 'Alice' }, namespace, socket as never, sinon.stub());

        expect(handleActiveGameDisconnectStub.calledOnceWithExactly(gameId, 'Alice', namespace, sinon.match.func)).to.equal(true);
        expect(activeGameGarbageCollectorService.reevaluateFinishedGameMark.calledOnceWithExactly(gameId)).to.equal(true);
    });

    it('reevaluates finished-game GC mark when a socket disconnects', async () => {
        const gameId = 'active-game-1';
        const socket = {
            data: {
                playerNamesByGameId: { [gameId]: 'Alice' },
            },
        };
        const activeGame = createActiveGame(['Alice'], 0, null);
        activeGame.turnOrder = [];
        const handleWaitingRoomDisconnectStub = sinon.stub(service, 'handleWaitingRoomDisconnect').resolves();
        activeGameService.getActiveGameById.resolves(activeGame);

        await service.handleDisconnect(socket as never, namespace, sinon.stub());

        expect(handleWaitingRoomDisconnectStub.calledOnceWithExactly(gameId, 'Alice', namespace)).to.equal(true);
        expect(activeGameGarbageCollectorService.reevaluateFinishedGameMark.calledOnceWithExactly(gameId)).to.equal(true);
    });

    it('skips disconnect entries when the active game is missing — Edge case', async () => {
        const gameId = 'missing-game';
        const socket = {
            data: {
                playerNamesByGameId: { [gameId]: 'Alice' },
            },
        };
        activeGameService.getActiveGameById.resolves(null);

        await service.handleDisconnect(socket as never, namespace, sinon.stub());

        expect(endGameService.handlePlayerAbandon.called).to.equal(false);
        expect(turnService.endTurn.called).to.equal(false);
    });

    it('reevaluates finished-game GC mark when leaving a waiting room', async () => {
        const gameId = 'active-game-1';
        const socket = {
            leave: sinon.stub(),
            data: {
                playerNamesByGameId: { [gameId]: 'Alice' },
            },
        };

        await service.handleLeaveWaitingRoom({ gameId, playerId: 'Alice' }, namespace, socket as never);

        expect(activeGameService.removePlayer.calledOnceWithExactly(gameId, 'Alice')).to.equal(true);
        expect(activeGameGarbageCollectorService.reevaluateFinishedGameMark.calledOnceWithExactly(gameId)).to.equal(true);
        expect(socket.leave.calledOnceWithExactly(gameId)).to.equal(true);
    });

    it('parses join payload from string and object forms', () => {
        const fromString = service.parseJoinGamePayload('game-1');
        const fromObject = service.parseJoinGamePayload({ activeGameId: 'game-2', playerName: 'Alice' });
        const fromEmptyObject = service.parseJoinGamePayload({} as never);

        expect(fromString).to.deep.equal({ activeGameId: 'game-1' });
        expect(fromObject).to.deep.equal({ activeGameId: 'game-2', playerName: 'Alice' });
        expect(fromEmptyObject).to.deep.equal({ activeGameId: '', playerName: undefined });
    });

    it('sets and clears socket player name mappings', () => {
        const socket = {
            leave: sinon.stub(),
            data: {},
        };

        service.setSocketPlayerName(socket as never, GAME_ONE, 'Alice');
        expect((socket.data as { playerNamesByGameId?: Record<string, string> }).playerNamesByGameId).to.deep.equal({ [GAME_ONE]: 'Alice' });

        service.unregisterSocketFromGame(socket as never, GAME_ONE);
        expect(socket.leave.calledOnceWithExactly(GAME_ONE)).to.equal(true);
        expect((socket.data as { playerNamesByGameId?: Record<string, string> }).playerNamesByGameId).to.equal(undefined);
    });

    it('clears a socket room even when player metadata is missing — Edge case', () => {
        const socket = {
            leave: sinon.stub(),
            data: {},
        };

        service.unregisterSocketFromGame(socket as never, GAME_ONE);

        expect(socket.leave.calledOnceWithExactly(GAME_ONE)).to.equal(true);
        expect((socket.data as { playerNamesByGameId?: Record<string, string> }).playerNamesByGameId).to.equal(undefined);
    });

    it('leaves all non-target game rooms', () => {
        const socket = {
            id: 'socket-1',
            rooms: new Set(['socket-1', TARGET_GAME, OTHER_GAME, THIRD_GAME]),
            leave: sinon.stub(),
            data: {
                playerNamesByGameId: { [OTHER_GAME]: 'Alice', [THIRD_GAME]: 'Alice', [TARGET_GAME]: 'Alice' },
            },
        };

        service.leaveOtherGameRooms(socket as never, TARGET_GAME);

        expect(socket.leave.calledTwice).to.equal(true);
        expect(socket.leave.calledWithExactly(OTHER_GAME)).to.equal(true);
        expect(socket.leave.calledWithExactly(THIRD_GAME)).to.equal(true);
    });

    it('handles waiting-room disconnect for organizer and non-organizer', async () => {
        endGameService.checkIfOrganizer.onFirstCall().resolves(true);
        endGameService.checkIfOrganizer.onSecondCall().resolves(false);

        await service.handleWaitingRoomDisconnect(GAME_ONE, 'Alice', namespace);
        await service.handleWaitingRoomDisconnect(GAME_TWO, 'Bob', namespace);

        expect(activeGameService.deleteGameById.calledOnceWithExactly(GAME_ONE)).to.equal(true);
        expect(activeGameService.removePlayer.calledWithExactly(GAME_TWO, 'Bob')).to.equal(true);
        expect(namespaceEmitStub.calledWithExactly(SocketEvent.GameCanceled, { playerId: 'Alice', reason: 'organizer-left-waiting-room' })).to.equal(
            true,
        );
        expect(namespaceEmitStub.calledWithExactly(SocketEvent.LeftWaitingRoom, { playerId: 'Bob' })).to.equal(true);
    });

    it('returns early when active-game disconnect cannot find game or player', async () => {
        activeGameService.getActiveGameById.onFirstCall().resolves(null);
        await service.handleActiveGameDisconnect('missing-game', 'Alice', namespace, sinon.stub());

        const activeGame = createActiveGame(['Alice', 'Bob'], 0, null);
        activeGameService.getActiveGameById.onSecondCall().resolves(activeGame);
        await service.handleActiveGameDisconnect(activeGame._id, 'Unknown', namespace, sinon.stub());

        expect(endGameService.handlePlayerAbandon.called).to.equal(false);
        expect(namespaceEmitStub.called).to.equal(false);
    });

    it('disables debug mode when organizer leaves an active started game', async () => {
        const activeGame = createActiveGame(['Alice', 'Bob'], 0, null);
        activeGame.isDebugMode = true;
        activeGame.organizerName = 'Alice';
        const refreshedGame = createActiveGame(['Alice', 'Bob'], 1, null, ['Alice']);
        refreshedGame.isDebugMode = true;
        refreshedGame.organizerName = 'Alice';
        const emitGameLog = sinon.stub();
        activeGameService.getActiveGameById.onFirstCall().resolves(activeGame);
        activeGameService.getActiveGameById.onSecondCall().resolves(refreshedGame);

        await service.handleActiveGameDisconnect(activeGame._id, 'Alice', namespace, emitGameLog);

        expect(activeGameService.saveActiveGameById.calledWithExactly(activeGame._id, sinon.match.has('isDebugMode', false))).to.equal(true);
        expect(namespaceEmitStub.calledWithExactly(SocketEvent.DebugToggle, { playerName: 'Alice', isDebugMode: false })).to.equal(true);
        expect(emitGameLog.calledWithExactly(activeGame._id, 'Mode debug désactivé (organisateur Alice absent).')).to.equal(true);
    });

    it('handles player kick and organizer leave-waiting-room socket path', async () => {
        const socket = {
            leave: sinon.stub(),
            to: sinon.stub().returns({ emit: namespaceEmitStub }),
            data: {
                playerNamesByGameId: { [GAME_ONE]: 'Alice' },
            },
        };
        endGameService.checkIfOrganizer.resolves(true);

        await service.handlePlayerKick({ gameId: GAME_ONE, playerId: 'Bob' }, namespace);
        await service.handleLeaveWaitingRoom({ gameId: GAME_ONE, playerId: 'Alice' }, namespace, socket as never);

        expect(namespaceEmitStub.calledWithExactly(SocketEvent.PlayerKicked, { playerId: 'Bob' })).to.equal(true);
        expect(socket.to.calledWithExactly(GAME_ONE)).to.equal(true);
        expect(socket.leave.calledOnceWithExactly(GAME_ONE)).to.equal(true);
    });

    it('handles socket disconnect for both active and waiting-room games', async () => {
        const socket = {
            data: {
                playerNamesByGameId: { [ACTIVE_GAME]: 'Alice', [WAITING_GAME]: 'Bob' },
            },
        };
        const activeGame = createActiveGame(['Alice', 'Bob'], 0, null);
        const waitingGame = createActiveGame(['Bob'], 0, null);
        waitingGame.turnOrder = [];
        activeGameService.getActiveGameById.onFirstCall().resolves(activeGame);
        activeGameService.getActiveGameById.onSecondCall().resolves(waitingGame);
        const handleActiveGameDisconnectStub = sinon.stub(service, 'handleActiveGameDisconnect').resolves();
        const handleWaitingRoomDisconnectStub = sinon.stub(service, 'handleWaitingRoomDisconnect').resolves();

        await service.handleDisconnect(socket as never, namespace, sinon.stub());

        expect(handleActiveGameDisconnectStub.calledOnceWithExactly(ACTIVE_GAME, 'Alice', namespace, sinon.match.func)).to.equal(true);
        expect(handleWaitingRoomDisconnectStub.calledOnceWithExactly(WAITING_GAME, 'Bob', namespace)).to.equal(true);
        expect(activeGameGarbageCollectorService.reevaluateFinishedGameMark.calledTwice).to.equal(true);
    });

    it('returns early when disconnect socket has no game-player mapping', async () => {
        await service.handleDisconnect({ data: {} } as never, namespace, sinon.stub());

        expect(activeGameService.getActiveGameById.called).to.equal(false);
    });
});

function createActiveGame(
    playerNames: string[],
    currentPlayerIndex: number,
    currentAttack: ICurrentAttack | null,
    abandonedPlayers: string[] = [],
): IActiveGame {
    const players = playerNames.map((name) => createCharacter(name, abandonedPlayers.includes(name)));

    return {
        _id: 'active-game-1',
        game: {
            gameTitle: 'Arena',
            description: 'desc',
            gameMode: GameType.Classic,
            dateCreated: new Date('2026-01-01T00:00:00.000Z'),
            lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
            visibility: Visibility.Viewable,
            board: {
                cells: [[CellType.Empty]],
                items: [],
            },
        },
        players,
        currentPlayerIndex,
        turnOrder: playerNames,
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Alice',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        hasFlagId: '',
        turnStartTimeStamp: 0,
        currentAttack,
    };
}

function createCharacter(name: string, hasAbandoned = false): ICharacter {
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
        movementLeft: 4,
        victories: 0,
        hasAbandoned,
        startingPosition: { x: 0, y: 0 },
        currentPosition: { x: 0, y: 0 },
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
    };
}

function createCurrentAttack(attacker: string, defender: string): ICurrentAttack {
    return {
        attacker,
        defender,
        turnCount: 1,
        suspendedTurnTimer: 3,
        attackerPosture: null,
        defenderPosture: null,
    };
}

function createCombatOutcome(updatedActiveGame: IActiveGame): CombatOutcome {
    return {
        updatedActiveGame,
        winner: null,
        losers: [],
        cancelled: true,
    };
}
