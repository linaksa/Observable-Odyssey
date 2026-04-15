/**
 * Testing strategy — GameSessionService
 *
 * - Verify combat disconnect cleanup skips abandoned attackers after canceling combat.
 * - Verify the surviving attacker still gets the end-turn check when the defender disconnects.
 */
import { ActiveGameListSocketsService } from '@app/services/active-game/active-game-list-sockets.service';
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

describe('GameSessionService', () => {
    let service: GameSessionService;
    let activeGameService: {
        getActiveGameById: sinon.SinonStub;
        saveActiveGameById: sinon.SinonStub;
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
        gameplayActionService = {
            checkEndTurnIfNoMovesLeft: sinon.stub().resolves(),
        };
        Container.set(GameplayActionService, gameplayActionService as unknown as GameplayActionService);

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

    // Edge case: the attacker disconnects during combat cleanup, so the turn check must be skipped.
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

    // Nominal case: the surviving attacker still gets checked after the defender disconnects.
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
