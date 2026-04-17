/**
 * Testing strategy — GameplayRealtimeFlowService
 *
 * Approach:
 * - Treat the service as a facade and assert one-to-one delegation for every public API.
 * - Verify argument passthrough (including callbacks and namespace/socket references) across all flows.
 *
 * Edge cases covered:
 * - No branching logic in this layer: tests protect against wiring regressions between facade and subflows.
 * - Boolean-returning delegates are verified to keep their returned values.
 */
import { GameplayCombatFlowService } from '@app/services/realtime/gameplay-combat-flow.service';
import { GameplayFlagDecisionService } from '@app/services/realtime/gameplay-flag-decision.service';
import { GameplayInteractionFlowService } from '@app/services/realtime/gameplay-interaction-flow.service';
import { GameplayMovementFlowService } from '@app/services/realtime/gameplay-movement-flow.service';
import { GameplayRealtimeFlowService } from '@app/services/realtime/gameplay-realtime-flow.service';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Namespace, Socket } from 'socket.io';

describe('GameplayRealtimeFlowService', () => {
    let service: GameplayRealtimeFlowService;
    let movementFlow: {
        handlePlayerMove: sinon.SinonStub;
        checkEndTurnIfNoMovesLeft: sinon.SinonStub;
        emitGameEndedIfNeeded: sinon.SinonStub;
    };
    let interactionFlow: {
        handleToggleDoor: sinon.SinonStub;
        handleSanctuaryInteraction: sinon.SinonStub;
    };
    let combatFlow: {
        combatManager: sinon.SinonStub;
        canUseAction: sinon.SinonStub;
        handleChooseAttackPosture: sinon.SinonStub;
    };
    let flagDecision: {
        handleFlagAction: sinon.SinonStub;
        handleFlagTaken: sinon.SinonStub;
        handleFlagGiven: sinon.SinonStub;
        handleFlagTransferRejected: sinon.SinonStub;
        clearPendingRequest: sinon.SinonStub;
    };
    let socket: Socket;
    let namespace: Namespace;
    const emitLog = sinon.stub();

    beforeEach(() => {
        movementFlow = {
            handlePlayerMove: sinon.stub().resolves(),
            checkEndTurnIfNoMovesLeft: sinon.stub().resolves(),
            emitGameEndedIfNeeded: sinon.stub().resolves(false),
        };
        interactionFlow = {
            handleToggleDoor: sinon.stub().resolves(),
            handleSanctuaryInteraction: sinon.stub().resolves(),
        };
        combatFlow = {
            combatManager: sinon.stub().resolves(),
            canUseAction: sinon.stub().resolves(true),
            handleChooseAttackPosture: sinon.stub().resolves(),
        };
        flagDecision = {
            handleFlagAction: sinon.stub().resolves(false),
            handleFlagTaken: sinon.stub().resolves(),
            handleFlagGiven: sinon.stub().resolves(),
            handleFlagTransferRejected: sinon.stub().resolves(),
            clearPendingRequest: sinon.stub(),
        };
        socket = {} as Socket;
        namespace = {} as Namespace;

        service = new GameplayRealtimeFlowService(
            movementFlow as unknown as GameplayMovementFlowService,
            interactionFlow as unknown as GameplayInteractionFlowService,
            combatFlow as unknown as GameplayCombatFlowService,
            flagDecision as unknown as GameplayFlagDecisionService,
        );
    });

    afterEach(() => sinon.restore());

    it('handlePlayerMove delegates to movementFlow — Nominal case', async () => {
        const data = { gameId: 'g1', playerId: 'Alice', direction: { x: 1, y: 0 } };
        await service.handlePlayerMove(data as never, socket, namespace);
        expect(movementFlow.handlePlayerMove.calledOnceWithExactly(data, socket, namespace)).to.equal(true);
    });

    it('handleToggleDoor delegates to interactionFlow — Nominal case', async () => {
        const data = { gameId: 'g1', playerId: 'Alice', position: { x: 1, y: 2 } };
        await service.handleToggleDoor(data as never, socket, namespace, emitLog);
        expect(interactionFlow.handleToggleDoor.calledOnceWithExactly(data, socket, namespace, emitLog)).to.equal(true);
    });

    it('handleSanctuaryInteraction delegates to interactionFlow — Nominal case', async () => {
        const data = { gameId: 'g1', playerId: 'Alice', position: { x: 1, y: 2 }, choice: 'life' };
        await service.handleSanctuaryInteraction(data as never, socket, namespace, emitLog);
        expect(interactionFlow.handleSanctuaryInteraction.calledOnceWithExactly(data, socket, namespace, emitLog)).to.equal(true);
    });

    it('combatManager delegates to combatFlow — Nominal case', async () => {
        const ctx = { namespace, emitGameLog: emitLog };
        await service.combatManager('g1', 'Alice', 'Bob', socket, ctx);
        expect(combatFlow.combatManager.calledOnceWithExactly('g1', 'Alice', 'Bob', socket, ctx)).to.equal(true);
    });

    it('canUseAction delegates to combatFlow — Nominal case', async () => {
        const result = await service.canUseAction('g1', 'Alice', 'Bob');
        expect(result).to.equal(true);
        expect(combatFlow.canUseAction.calledOnceWithExactly('g1', 'Alice', 'Bob')).to.equal(true);
    });

    it('handleChooseAttackPosture delegates to combatFlow — Nominal case', async () => {
        const data = { gameId: 'g1', playerName: 'Alice', posture: 'aggressive' };
        await service.handleChooseAttackPosture(data as never, namespace);
        expect(combatFlow.handleChooseAttackPosture.calledOnceWithExactly(data, namespace)).to.equal(true);
    });

    it('handleFlagAction delegates to flagDecision — Nominal case', async () => {
        const data = { gameId: 'g1', currentPlayerName: 'Alice', targetName: 'Bob' };
        await service.handleFlagAction(data as never, namespace, emitLog);
        expect(flagDecision.handleFlagAction.calledOnceWithExactly(data, namespace, emitLog)).to.equal(true);
    });

    it('handleFlagTaken delegates to flagDecision — Nominal case', async () => {
        const data = { gameId: 'g1', playerName: 'Alice' };
        await service.handleFlagTaken(data as never, namespace, emitLog);
        expect(flagDecision.handleFlagTaken.calledOnceWithExactly(data, namespace, emitLog)).to.equal(true);
    });

    it('handleFlagGiven delegates to flagDecision — Nominal case', async () => {
        const data = { gameId: 'g1', playerName: 'Alice' };
        await service.handleFlagGiven(data as never, namespace, emitLog);
        expect(flagDecision.handleFlagGiven.calledOnceWithExactly(data, namespace, emitLog)).to.equal(true);
    });

    it('handleFlagTransferRejected delegates to flagDecision — Nominal case', async () => {
        const data = { gameId: 'g1', playerName: 'Alice' };
        await service.handleFlagTransferRejected(data as never, namespace, emitLog);
        expect(flagDecision.handleFlagTransferRejected.calledOnceWithExactly(data, namespace, emitLog)).to.equal(true);
    });

    it('clearPendingFlagRequest delegates to flagDecision — Nominal case', () => {
        service.clearPendingFlagRequest('g1');
        expect(flagDecision.clearPendingRequest.calledOnceWithExactly('g1')).to.equal(true);
    });

    it('checkEndTurnIfNoMovesLeft delegates to movementFlow — Nominal case', async () => {
        await service.checkEndTurnIfNoMovesLeft('g1', 'Alice');
        expect(movementFlow.checkEndTurnIfNoMovesLeft.calledOnceWithExactly('g1', 'Alice')).to.equal(true);
    });

    it('emitGameEndedIfNeeded delegates to movementFlow — Nominal case', async () => {
        movementFlow.emitGameEndedIfNeeded.resolves(true);
        const result = await service.emitGameEndedIfNeeded('g1', namespace);
        expect(result).to.equal(true);
        expect(movementFlow.emitGameEndedIfNeeded.calledOnceWithExactly('g1', namespace)).to.equal(true);
    });
});
