import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { EndGameService } from '@app/services/gameplay/end-game.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { SocketService } from '@app/services/realtime/socket.service';
import { VirtualPlayerTurnFinalizerService } from '@app/services/virtual-player/virtual-player-turn-finalizer.service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { GameType, Visibility } from '@common/game';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { expect } from 'chai';
import * as sinon from 'sinon';

describe('VirtualPlayerTurnFinalizerService', () => {
    let endGameService: { checkEndGame: sinon.SinonStub };
    let activeGameService: { getActiveGameById: sinon.SinonStub };
    let socketService: { getNamespace: sinon.SinonStub };
    let turnService: { endTurn: sinon.SinonStub };

    let namespaceToStub: sinon.SinonStub;
    let namespaceEmitStub: sinon.SinonStub;
    let finalizer: VirtualPlayerTurnFinalizerService;

    beforeEach(() => {
        endGameService = { checkEndGame: sinon.stub().resolves(false) };
        activeGameService = { getActiveGameById: sinon.stub().resolves(createActiveGame()) };

        namespaceEmitStub = sinon.stub();
        namespaceToStub = sinon.stub().returns({ emit: namespaceEmitStub });
        socketService = { getNamespace: sinon.stub().returns({ to: namespaceToStub }) };

        turnService = { endTurn: sinon.stub().resolves() };

        finalizer = new VirtualPlayerTurnFinalizerService(
            endGameService as unknown as EndGameService,
            activeGameService as unknown as ActiveGameService,
            socketService as unknown as SocketService,
            turnService as unknown as TurnService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should emit GameEnded and then end turn when game ended', async () => {
        const game = createActiveGame();
        endGameService.checkEndGame.resolves(true);
        activeGameService.getActiveGameById.resolves({ ...game, isFinished: true, winner: 'red team' });

        await finalizer.finalizeTurn(game._id);

        expect(socketService.getNamespace.calledOnceWithExactly(Namespaces.Game)).to.equal(true);
        expect(namespaceToStub.calledOnceWithExactly(game._id)).to.equal(true);
        expect(namespaceEmitStub.calledOnceWithExactly(SocketEvent.GameEnded, { winner: 'red team' })).to.equal(true);
        expect(turnService.endTurn.calledOnceWithExactly(game._id)).to.equal(true);
    });

    it('should only end turn when game has not ended', async () => {
        const game = createActiveGame();
        endGameService.checkEndGame.resolves(false);

        await finalizer.finalizeTurn(game._id);

        expect(socketService.getNamespace.called).to.equal(false);
        expect(turnService.endTurn.calledOnceWithExactly(game._id)).to.equal(true);
    });
});

function createActiveGame(): IActiveGame {
    return {
        _id: 'game-1',
        game: {
            gameTitle: 'test',
            description: '',
            gameMode: GameType.Ctf,
            dateCreated: new Date('2026-01-01T00:00:00.000Z'),
            lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
            visibility: Visibility.Hidden,
            board: {
                cells: [[CellType.Empty]],
                items: [],
            },
        },
        players: [],
        currentPlayerIndex: 0,
        turnOrder: [],
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'org',
        maxPlayerCount: 2,
        turnIsInPreparation: false,
        hasFlagId: '',
        turnStartTimeStamp: 0,
        currentAttack: null,
    };
}
