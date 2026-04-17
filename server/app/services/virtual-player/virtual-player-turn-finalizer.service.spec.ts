/**
 * Testing strategy — VirtualPlayerTurnFinalizerService end-of-turn flow
 *
 * Approach:
 * - Stub end-game, active-game, socket, turn, log, and garbage-collector collaborators.
 * - Validate turn ownership tracking through beginTurn(), isTurnInProgress(), and finishTurn().
 * - Validate finalizeTurn() side effects for canceled games and combat-in-progress guards.
 *
 * Edge cases covered:
 * - Canceled-game detection emits cancellation payload, game log, and GC reevaluation.
 * - Active combat causes early return without ending the turn.
 */
import { ActiveGameGarbageCollectorService } from '@app/services/active-game/active-game-garbage-collector.service';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { EndGameService } from '@app/services/gameplay/end-game.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { GameplayLogService } from '@app/services/realtime/gameplay-log.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { VirtualPlayerTurnFinalizerService } from '@app/services/virtual-player/virtual-player-turn-finalizer.service';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Container } from 'typedi';

describe('VirtualPlayerTurnFinalizerService', () => {
    let service: VirtualPlayerTurnFinalizerService;
    let endGameService: { checkEndGame: sinon.SinonStub; getEndGameLogMessage: sinon.SinonStub };
    let activeGameService: { getActiveGameById: sinon.SinonStub };
    let socketService: { getNamespace: sinon.SinonStub };
    let turnService: { endTurn: sinon.SinonStub };
    let gameplayLogService: { emitGameLogToRoom: sinon.SinonStub };
    let garbageCollector: { reevaluateFinishedGameMark: sinon.SinonStub };
    let namespaceEmitStub: sinon.SinonStub;

    beforeEach(() => {
        Container.reset();
        endGameService = {
            checkEndGame: sinon.stub().resolves({ hasEnded: false, winner: null, reason: null, completionType: null, remainingPlayers: [] }),
            getEndGameLogMessage: sinon.stub().returns('Fin de partie.'),
        };
        activeGameService = {
            getActiveGameById: sinon.stub().resolves({
                _id: 'game-1',
                currentPlayerIndex: 0,
                turnOrder: ['Alice'],
                currentAttack: null,
            }),
        };
        namespaceEmitStub = sinon.stub();
        socketService = {
            getNamespace: sinon.stub().returns({ to: sinon.stub().returns({ emit: namespaceEmitStub }) }),
        };
        turnService = { endTurn: sinon.stub().resolves() };
        gameplayLogService = { emitGameLogToRoom: sinon.stub() };
        garbageCollector = { reevaluateFinishedGameMark: sinon.stub().resolves() };
        Container.set(ActiveGameGarbageCollectorService, garbageCollector as unknown as ActiveGameGarbageCollectorService);

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

    it('tracks and clears active turn ownership', () => {
        service.beginTurn('game-1', 'Alice');
        expect(service.isTurnInProgress('game-1')).to.equal(true);

        service.finishTurn('game-1');
        expect(service.isTurnInProgress('game-1')).to.equal(false);
    });

    it('emits canceled payload when virtual turn finalization detects canceled game', async () => {
        endGameService.checkEndGame.resolves({
            hasEnded: true,
            winner: null,
            reason: 'insufficient-active-players',
            completionType: 'canceled',
            remainingPlayers: ['Alice'],
        });
        // Edge case: canceled games should broadcast cancellation instead of normal turn progression.
        service.beginTurn('game-1', 'Alice');

        await service.finalizeTurn('game-1');

        expect(socketService.getNamespace.calledOnceWithExactly(Namespaces.Game)).to.equal(true);
        expect(namespaceEmitStub.calledWithMatch(SocketEvent.GameCanceled, sinon.match.object)).to.equal(true);
        expect(gameplayLogService.emitGameLogToRoom.calledOnce).to.equal(true);
        expect(garbageCollector.reevaluateFinishedGameMark.calledOnceWithExactly('game-1')).to.equal(true);
    });

    it('returns early when active combat is in progress', async () => {
        service.beginTurn('game-1', 'Alice');
        activeGameService.getActiveGameById.resolves({
            _id: 'game-1',
            currentPlayerIndex: 0,
            turnOrder: ['Alice'],
            currentAttack: { attacker: 'Alice', defender: 'Bob' },
        });

        await service.finalizeTurn('game-1');

        expect(turnService.endTurn.called).to.equal(false);
    });
});
