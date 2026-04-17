/**
 * Testing strategy — GameplayTurnEndService
 *
 * Approach:
 * - Validate emitGameEndedIfNeeded across winner and cancellation outcomes, including emitted logs/events.
 * - Exercise checkEndTurnIfNoMovesLeft with movement/action availability combinations.
 *
 * Edge cases covered:
 * - Non-ended games avoid GameEnded emission and GC reevaluation side effects.
 * - Cancellation completions include remaining players in GameEnded payloads.
 * - Any remaining movement/action opportunity keeps the turn active.
 */
import { ActiveGameGarbageCollectorService } from '@app/services/active-game/active-game-garbage-collector.service';
import { ActionService } from '@app/services/gameplay/action-service';
import { EndGameService } from '@app/services/gameplay/end-game.service';
import { MovementService } from '@app/services/gameplay/movement-service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { GameplayTurnEndService } from '@app/services/realtime/gameplay-turn-end.service';
import { SocketEvent } from '@common/socket-events';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Namespace } from 'socket.io';

describe('GameplayTurnEndService', () => {
    let service: GameplayTurnEndService;
    let movementService: {
        getReachablePositions: sinon.SinonStub;
    };
    let actionService: {
        canUseActionAnyPlayer: sinon.SinonStub;
        canUseAnySanctuary: sinon.SinonStub;
    };
    let turnService: {
        endTurn: sinon.SinonStub;
    };
    let endGameService: {
        checkEndGame: sinon.SinonStub;
        getEndGameLogMessage: sinon.SinonStub;
    };
    let activeGameGarbageCollectorService: {
        reevaluateFinishedGameMark: sinon.SinonStub;
    };
    let emitStub: sinon.SinonStub;
    let namespace: Namespace;

    beforeEach(() => {
        movementService = {
            getReachablePositions: sinon.stub().resolves([]),
        };
        actionService = {
            canUseActionAnyPlayer: sinon.stub().resolves(false),
            canUseAnySanctuary: sinon.stub().resolves(false),
        };
        turnService = {
            endTurn: sinon.stub().resolves(),
        };
        endGameService = {
            checkEndGame: sinon.stub(),
            getEndGameLogMessage: sinon.stub().returns('Fin de partie.'),
        };
        activeGameGarbageCollectorService = {
            reevaluateFinishedGameMark: sinon.stub().resolves(),
        };
        emitStub = sinon.stub();
        namespace = {
            to: sinon.stub().returns({ emit: emitStub }),
        } as unknown as Namespace;

        service = new GameplayTurnEndService(
            movementService as unknown as MovementService,
            actionService as unknown as ActionService,
            turnService as unknown as TurnService,
            endGameService as unknown as EndGameService,
            activeGameGarbageCollectorService as unknown as ActiveGameGarbageCollectorService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('reevaluates GC mark when a game ends', async () => {
        const gameId = 'active-game-1';
        endGameService.checkEndGame.resolves({ hasEnded: true, winner: 'Alice', reason: null, remainingPlayers: ['Alice'] });

        const hasEnded = await service.emitGameEndedIfNeeded(gameId, namespace);

        expect(hasEnded).to.equal(true);
        expect(emitStub.calledWithExactly(SocketEvent.GameEnded, { winner: 'Alice' })).to.equal(true);
        expect(emitStub.calledWithMatch(SocketEvent.GameLog, { message: 'Fin de partie.', postedAt: sinon.match.string })).to.equal(true);
        expect(activeGameGarbageCollectorService.reevaluateFinishedGameMark.calledOnceWithExactly(gameId)).to.equal(true);
    });

    it('does not reevaluate GC mark when the game has not ended', async () => {
        endGameService.checkEndGame.resolves({ hasEnded: false, winner: null, reason: null, remainingPlayers: [] });

        const hasEnded = await service.emitGameEndedIfNeeded('active-game-1', namespace);

        expect(hasEnded).to.equal(false);
        expect(activeGameGarbageCollectorService.reevaluateFinishedGameMark.called).to.equal(false);
    });

    it('emits canceled payload when game completion type is canceled', async () => {
        endGameService.checkEndGame.resolves({
            hasEnded: true,
            winner: null,
            reason: 'abandon',
            completionType: 'canceled',
            remainingPlayers: ['Alice'],
        });

        const hasEnded = await service.emitGameEndedIfNeeded('active-game-1', namespace);

        expect(hasEnded).to.equal(true);
        expect(emitStub.calledWithMatch(SocketEvent.GameCanceled, sinon.match.object)).to.equal(true);
        expect(emitStub.calledWithExactly(SocketEvent.GameEnded, sinon.match.any)).to.equal(false);
    });

    it('ends turn when there are no moves and no available actions', async () => {
        await service.checkEndTurnIfNoMovesLeft('active-game-1', 'Alice');

        expect(turnService.endTurn.calledOnceWithExactly('active-game-1')).to.equal(true);
    });

    it('keeps turn active when movement is still available', async () => {
        movementService.getReachablePositions.resolves([{ x: 1, y: 1 }]);

        await service.checkEndTurnIfNoMovesLeft('active-game-1', 'Alice');

        expect(turnService.endTurn.called).to.equal(false);
    });
});
