/**
 * Testing strategy — GameplayMovementFlowService
 *
 * Approach:
 * - Exercise handlePlayerMove with successful and failing movement-service outcomes.
 * - Verify turn-end delegation methods forward arguments and return values unchanged.
 *
 * Edge cases covered:
 * - Movement failures emit AppError codes or fallback internal codes for unknown errors.
 * - Delegated turn-end helpers preserve passthrough behavior for both void and boolean results.
 */
import { MovementService } from '@app/services/gameplay/movement-service';
import { GameplayTurnEndService } from '@app/services/realtime/gameplay-turn-end.service';
import { GameplayMovementFlowService } from '@app/services/realtime/gameplay-movement-flow.service';
import { ErrorCode } from '@common/error-codes';
import { SocketEvent } from '@common/socket-events';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Namespace, Socket } from 'socket.io';
import { AppError } from '@app/error-types/app-error';
import { StatusCodes } from 'http-status-codes';

describe('GameplayMovementFlowService', () => {
    let service: GameplayMovementFlowService;
    let movementService: { movePlayer: sinon.SinonStub };
    let turnEndService: {
        checkEndTurnIfNoMovesLeft: sinon.SinonStub;
        emitGameEndedIfNeeded: sinon.SinonStub;
    };
    let socket: { emit: sinon.SinonStub };
    let namespace: { to: sinon.SinonStub };
    let namespaceEmit: sinon.SinonStub;

    beforeEach(() => {
        movementService = { movePlayer: sinon.stub() };
        turnEndService = {
            checkEndTurnIfNoMovesLeft: sinon.stub().resolves(),
            emitGameEndedIfNeeded: sinon.stub().resolves(false),
        };
        socket = { emit: sinon.stub() };
        namespaceEmit = sinon.stub();
        namespace = { to: sinon.stub().returns({ emit: namespaceEmit }) };

        service = new GameplayMovementFlowService(movementService as unknown as MovementService, turnEndService as unknown as GameplayTurnEndService);
    });

    afterEach(() => sinon.restore());

    describe('handlePlayerMove', () => {
        it('emits PlayerMoved and checks end-turn on success — Nominal case', async () => {
            const newPosition = { x: 1, y: 2 };
            movementService.movePlayer.resolves({ newPosition, movementLeft: 3 });

            await service.handlePlayerMove(
                { gameId: 'g1', playerId: 'Alice', direction: newPosition },
                socket as unknown as Socket,
                namespace as unknown as Namespace,
            );

            expect(
                namespaceEmit.calledOnceWithExactly(SocketEvent.PlayerMoved, {
                    playerId: 'Alice',
                    newPosition,
                    movementLeft: 3,
                }),
            ).to.equal(true);
            expect(turnEndService.checkEndTurnIfNoMovesLeft.calledOnceWithExactly('g1', 'Alice')).to.equal(true);
            expect(turnEndService.emitGameEndedIfNeeded.calledOnceWithExactly('g1', namespace)).to.equal(true);
        });

        it('emits PlayerMoveError when movePlayer throws — Edge case', async () => {
            const appError = new AppError([ErrorCode.PositionNotWalkable], StatusCodes.BAD_REQUEST);
            movementService.movePlayer.rejects(appError);

            await service.handlePlayerMove(
                { gameId: 'g1', playerId: 'Alice', direction: { x: 0, y: 0 } },
                socket as unknown as Socket,
                namespace as unknown as Namespace,
            );

            expect(
                socket.emit.calledOnceWithExactly(SocketEvent.PlayerMoveError, {
                    errorCodes: [ErrorCode.PositionNotWalkable],
                }),
            ).to.equal(true);
            expect(namespaceEmit.called).to.equal(false);
        });

        it('emits PlayerMoveError with fallback code for plain error — Edge case', async () => {
            movementService.movePlayer.rejects(new Error('generic'));

            await service.handlePlayerMove(
                { gameId: 'g1', playerId: 'Alice', direction: { x: 0, y: 0 } },
                socket as unknown as Socket,
                namespace as unknown as Namespace,
            );

            expect(
                socket.emit.calledOnceWithExactly(SocketEvent.PlayerMoveError, {
                    errorCodes: [ErrorCode.PositionNotWalkable],
                }),
            ).to.equal(true);
        });
    });

    describe('checkEndTurnIfNoMovesLeft', () => {
        it('delegates to GameplayTurnEndService — Nominal case', async () => {
            await service.checkEndTurnIfNoMovesLeft('g1', 'Alice');

            expect(turnEndService.checkEndTurnIfNoMovesLeft.calledOnceWithExactly('g1', 'Alice')).to.equal(true);
        });
    });

    describe('emitGameEndedIfNeeded', () => {
        it('delegates to GameplayTurnEndService and returns its result — Nominal case', async () => {
            turnEndService.emitGameEndedIfNeeded.resolves(true);

            const result = await service.emitGameEndedIfNeeded('g1', namespace as unknown as Namespace);

            expect(result).to.equal(true);
            expect(turnEndService.emitGameEndedIfNeeded.calledOnceWithExactly('g1', namespace)).to.equal(true);
        });
    });
});
