import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { StartGameService } from '@app/services/gameplay/start-game.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { GameSessionService } from '@app/services/realtime/game-session.service';
import { GameplayActionService } from '@app/services/realtime/gameplay-action.service';
import { GameplayLogService } from '@app/services/realtime/gameplay-log.service';
import { GameplayRealtimeFlowService } from '@app/services/realtime/gameplay-realtime-flow.service';
import { ErrorCode } from '@common/error-codes';
import { SocketEvent } from '@common/socket-events';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Namespace, Socket } from 'socket.io';

describe('GameplayActionService', () => {
    let service: GameplayActionService;
    let flowService: {
        canUseAction: sinon.SinonStub;
        handleFlagAction: sinon.SinonStub;
        combatManager: sinon.SinonStub;
    };
    let socket: Socket;
    let socketEmitStub: sinon.SinonStub;
    let namespace: Namespace;

    beforeEach(() => {
        flowService = {
            canUseAction: sinon.stub().resolves(true),
            handleFlagAction: sinon.stub().resolves(false),
            combatManager: sinon.stub().resolves(),
        };
        service = new GameplayActionService(
            {} as TurnService,
            {} as StartGameService,
            {} as ActiveGameService,
            {} as GameSessionService,
            { emitGameLogToRoom: sinon.stub() } as unknown as GameplayLogService,
            flowService as unknown as GameplayRealtimeFlowService,
        );
        socketEmitStub = sinon.stub();
        socket = { emit: socketEmitStub } as unknown as Socket;
        namespace = { to: sinon.stub().returns({ emit: sinon.stub() }) } as unknown as Namespace;
    });

    afterEach(() => {
        sinon.restore();
    });

    it('emits ActionError when action is not allowed', async () => {
        flowService.canUseAction.resolves(false);

        await service.handleAction({ gameId: 'game-1', currentPlayerName: 'Alice', targetName: 'Bob' }, socket, namespace);

        expect(socketEmitStub.calledOnceWithExactly(SocketEvent.ActionError, { errorCodes: [ErrorCode.ActionNotAllowed] })).to.equal(true);
        expect(flowService.handleFlagAction.called).to.equal(false);
        expect(flowService.combatManager.called).to.equal(false);
    });

    it('starts combat when action is allowed and not handled as a flag action', async () => {
        await service.handleAction({ gameId: 'game-1', currentPlayerName: 'Alice', targetName: 'Bob' }, socket, namespace);

        expect(flowService.canUseAction.calledOnceWithExactly('game-1', 'Alice', 'Bob')).to.equal(true);
        expect(flowService.handleFlagAction.calledOnce).to.equal(true);
        expect(flowService.combatManager.calledOnceWithExactly('game-1', 'Alice', 'Bob', socket, sinon.match.any)).to.equal(true);
    });
});
