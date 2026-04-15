/**
 * Testing strategy — ActiveGameGarbageCollectorService
 *
 * Approach:
 * - Stub ActiveGameService, SocketService, and activeGameModel.deleteMany to isolate GC logic.
 * - Use fake timers for deterministic mark/sweep timestamp assertions.
 *
 * Edge cases covered:
 * - Missing active game should be a no-op.
 * - Already marked finished game with no real players should remain unchanged.
 * - Connected virtual players should never count as connected real players.
 */
import { activeGameModel } from '@app/schemas/active-game';
import { ActiveGameGarbageCollectorService } from '@app/services/active-game/active-game-garbage-collector.service';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { ICharacter, VirtualPlayerProfile } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { ISocketData } from '@common/socket-payloads';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Namespace } from 'socket.io';

const defaultGameId = 'active-game-1';

describe('ActiveGameGarbageCollectorService', () => {
    const gameId = defaultGameId;
    const fixedNow = new Date('2026-01-01T10:00:00.000Z');
    const previousMark = new Date('2025-12-31T20:00:00.000Z');
    const gracePeriodMs = 1000;

    let service: ActiveGameGarbageCollectorService;
    let activeGameService: {
        getActiveGameById: sinon.SinonStub;
        saveActiveGameById: sinon.SinonStub;
    };
    let socketService: {
        hasNamespace: sinon.SinonStub;
        getNamespace: sinon.SinonStub;
    };
    let deleteManyStub: sinon.SinonStub;
    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
        activeGameService = {
            getActiveGameById: sinon.stub(),
            saveActiveGameById: sinon.stub().resolves(null),
        };
        socketService = {
            hasNamespace: sinon.stub().returns(false),
            getNamespace: sinon.stub(),
        };
        deleteManyStub = sinon.stub(activeGameModel, 'deleteMany').resolves({ deletedCount: 0 } as never);
        service = new ActiveGameGarbageCollectorService(activeGameService as unknown as ActiveGameService, socketService as unknown as SocketService);
        clock = sinon.useFakeTimers({ now: fixedNow });
    });

    afterEach(() => {
        clock.restore();
        sinon.restore();
    });

    it('counts only unique connected real players for a game', async () => {
        // Nominal case
        activeGameService.getActiveGameById.resolves(
            createActiveGame({
                players: [createCharacter('Alice'), createCharacter('Bob'), createCharacter('Bot', VirtualPlayerProfile.Defensive)],
            }),
        );
        socketService.hasNamespace.returns(true);
        socketService.getNamespace.returns(
            createNamespace({
                socketOne: { playerNamesByGameId: { [gameId]: 'Alice' } },
                socketTwo: { playerNamesByGameId: { [gameId]: 'Bot' } },
                socketThree: { playerNamesByGameId: { [gameId]: 'Alice' } },
                socketFour: { playerNamesByGameId: { otherGame: 'Bob' } },
            }),
        );

        const connectedCount = await service.countConnectedRealPlayers(gameId);

        expect(connectedCount).to.equal(1);
    });

    it('does nothing when reevaluating a missing game', async () => {
        // Edge case
        activeGameService.getActiveGameById.resolves(null);

        await service.reevaluateFinishedGameMark(gameId);

        expect(activeGameService.saveActiveGameById.called).to.equal(false);
    });

    it('marks a finished game when no real players are connected', async () => {
        // Nominal case
        activeGameService.getActiveGameById.resolves(
            createActiveGame({
                isFinished: true,
                markedForDeletionAt: null,
                players: [createCharacter('Alice')],
            }),
        );
        socketService.hasNamespace.returns(true);
        socketService.getNamespace.returns(createNamespace({}));

        await service.reevaluateFinishedGameMark(gameId);

        expect(activeGameService.saveActiveGameById.calledOnce).to.equal(true);
        expect(activeGameService.saveActiveGameById.firstCall.args[0]).to.equal(gameId);
        expect((activeGameService.saveActiveGameById.firstCall.args[1].markedForDeletionAt as Date).toISOString()).to.equal(fixedNow.toISOString());
    });

    it('clears the deletion mark when at least one real player is connected', async () => {
        // Nominal case
        activeGameService.getActiveGameById.resolves(
            createActiveGame({
                isFinished: true,
                markedForDeletionAt: previousMark,
                players: [createCharacter('Alice')],
            }),
        );
        socketService.hasNamespace.returns(true);
        socketService.getNamespace.returns(createNamespace({ socketOne: { playerNamesByGameId: { [gameId]: 'Alice' } } }));

        await service.reevaluateFinishedGameMark(gameId);

        expect(activeGameService.saveActiveGameById.calledOnceWithExactly(gameId, { markedForDeletionAt: null })).to.equal(true);
    });

    it('clears stale deletion mark for unfinished games', async () => {
        // Edge case
        activeGameService.getActiveGameById.resolves(createActiveGame({ isFinished: false, markedForDeletionAt: previousMark }));

        await service.reevaluateFinishedGameMark(gameId);

        expect(activeGameService.saveActiveGameById.calledOnceWithExactly(gameId, { markedForDeletionAt: null })).to.equal(true);
    });

    it('does not update an unfinished game that is not marked', async () => {
        // Edge case
        activeGameService.getActiveGameById.resolves(createActiveGame({ isFinished: false, markedForDeletionAt: null }));

        await service.reevaluateFinishedGameMark(gameId);

        expect(activeGameService.saveActiveGameById.called).to.equal(false);
    });

    it('does not update a finished game that is already marked and still empty', async () => {
        // Edge case
        activeGameService.getActiveGameById.resolves(
            createActiveGame({
                isFinished: true,
                markedForDeletionAt: previousMark,
                players: [createCharacter('Alice')],
            }),
        );
        socketService.hasNamespace.returns(true);
        socketService.getNamespace.returns(createNamespace({}));

        await service.reevaluateFinishedGameMark(gameId);

        expect(activeGameService.saveActiveGameById.called).to.equal(false);
    });

    it('does not mark a finished game when a real player is connected and no mark exists', async () => {
        // Edge case
        activeGameService.getActiveGameById.resolves(
            createActiveGame({
                isFinished: true,
                markedForDeletionAt: null,
                players: [createCharacter('Alice')],
            }),
        );
        socketService.hasNamespace.returns(true);
        socketService.getNamespace.returns(createNamespace({ socketOne: { playerNamesByGameId: { [gameId]: 'Alice' } } }));

        await service.reevaluateFinishedGameMark(gameId);

        expect(activeGameService.saveActiveGameById.called).to.equal(false);
    });

    it('marks a finished game when only virtual players are connected', async () => {
        // Edge case
        activeGameService.getActiveGameById.resolves(
            createActiveGame({
                isFinished: true,
                markedForDeletionAt: null,
                players: [createCharacter('Bot', VirtualPlayerProfile.Defensive)],
            }),
        );
        socketService.hasNamespace.returns(true);
        socketService.getNamespace.returns(createNamespace({ socketOne: { playerNamesByGameId: { [gameId]: 'Bot' } } }));

        await service.reevaluateFinishedGameMark(gameId);

        expect(activeGameService.saveActiveGameById.calledOnce).to.equal(true);
        expect(activeGameService.saveActiveGameById.firstCall.args[0]).to.equal(gameId);
        expect((activeGameService.saveActiveGameById.firstCall.args[1].markedForDeletionAt as Date).toISOString()).to.equal(fixedNow.toISOString());
    });

    it('sweeps only finished games marked before the grace-period cutoff', async () => {
        // Nominal case
        deleteManyStub.resolves({ deletedCount: 2 });

        const deletedCount = await service.sweepMarkedGames(gracePeriodMs);

        expect(deletedCount).to.equal(2);
        expect(deleteManyStub.calledOnce).to.equal(true);
        expect(deleteManyStub.firstCall.args[0].isFinished).to.equal(true);
        expect(deleteManyStub.firstCall.args[0].markedForDeletionAt.$ne).to.equal(null);
        expect((deleteManyStub.firstCall.args[0].markedForDeletionAt.$lte as Date).toISOString()).to.equal(
            new Date(fixedNow.getTime() - gracePeriodMs).toISOString(),
        );
    });

    it('normalizes negative grace period to sweep up to now', async () => {
        // Edge case
        await service.sweepMarkedGames(-gracePeriodMs);

        expect(deleteManyStub.calledOnce).to.equal(true);
        expect((deleteManyStub.firstCall.args[0].markedForDeletionAt.$lte as Date).toISOString()).to.equal(fixedNow.toISOString());
    });
});

function createActiveGame(overrides: Partial<IActiveGame> = {}): IActiveGame {
    return {
        _id: defaultGameId,
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
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        startedAt: null,
        endedAt: null,
        markedForDeletionAt: null,
        players: [createCharacter('Alice')],
        currentPlayerIndex: 0,
        turnOrder: ['Alice'],
        isFinished: true,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Alice',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        hasFlagId: '',
        turnStartTimeStamp: 0,
        currentAttack: null,
        ...overrides,
    };
}

function createCharacter(name: string, virtualPlayerProfile?: VirtualPlayerProfile): ICharacter {
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
        hasAbandoned: false,
        startingPosition: { x: 0, y: 0 },
        currentPosition: { x: 0, y: 0 },
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
        virtualPlayerProfile,
    };
}

function createNamespace(socketDataBySocketId: Record<string, ISocketData>): Namespace {
    const sockets = new Map<string, { data: ISocketData }>();
    Object.entries(socketDataBySocketId).forEach(([socketId, data]) => {
        sockets.set(socketId, { data });
    });
    return { sockets } as unknown as Namespace;
}
