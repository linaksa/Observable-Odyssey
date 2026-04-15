/**
 * Testing strategy — GameplayTurnEndService
 *
 * - Verify finished-game emission path also triggers GC mark reevaluation.
 * - Verify non-ended games do not trigger reevaluation.
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
            { getReachablePositions: sinon.stub().resolves([]) } as unknown as MovementService,
            {
                canUseActionAnyPlayer: sinon.stub().resolves(false),
                canUseAnySanctuary: sinon.stub().resolves(false),
            } as unknown as ActionService,
            { endTurn: sinon.stub().resolves() } as unknown as TurnService,
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
});
