/**
 * Testing strategy — GameplayLogService
 *
 * Approach:
 * - Stub namespace resolution and socket collections to test room-wide and per-player game log emission.
 * - Verify payload shape and recipient filtering for each public logging method.
 *
 * Edge cases covered:
 * - Empty game ids, blank messages, and empty player targets no-op safely.
 * - Private logs skip sockets outside the room, non-target players, or missing player mapping metadata.
 */
import { GameplayLogService } from '@app/services/realtime/gameplay-log.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { SocketEvent } from '@common/socket-events';
import { ISocketData } from '@common/socket-payloads';
import { expect } from 'chai';
import * as sinon from 'sinon';

const GAME_ROOM_ID = 'game-1';
const OTHER_ROOM_ID = 'other-room';

describe('GameplayLogService', () => {
    let service: GameplayLogService;
    let toEmitStub: sinon.SinonStub;
    let roomEmitStub: sinon.SinonStub;
    let namespace: {
        to: sinon.SinonStub;
        sockets: Map<string, { rooms: Set<string>; data: ISocketData; emit: sinon.SinonStub }>;
    };
    let socketService: { getNamespace: sinon.SinonStub };

    beforeEach(() => {
        roomEmitStub = sinon.stub();
        toEmitStub = sinon.stub().returns({ emit: roomEmitStub });
        namespace = {
            to: toEmitStub,
            sockets: new Map(),
        };
        socketService = { getNamespace: sinon.stub().returns(namespace) };
        service = new GameplayLogService(socketService as unknown as SocketService);
    });

    afterEach(() => sinon.restore());

    // emitGameLogToRoom scenarios.

    it('emits a GameLog event to the room — Nominal case', () => {
        service.emitGameLogToRoom(GAME_ROOM_ID, 'Hello');

        expect(toEmitStub.calledOnceWithExactly(GAME_ROOM_ID)).to.equal(true);
        expect(roomEmitStub.calledOnceWithExactly(SocketEvent.GameLog, sinon.match({ message: 'Hello', postedAt: sinon.match.string }))).to.equal(
            true,
        );
    });

    it('does not emit when gameId is empty — Edge case', () => {
        service.emitGameLogToRoom('', 'Hello');

        expect(toEmitStub.called).to.equal(false);
    });

    it('does not emit when message is whitespace only — Edge case', () => {
        service.emitGameLogToRoom(GAME_ROOM_ID, '   ');

        expect(toEmitStub.called).to.equal(false);
    });

    // emitPrivateGameLogToPlayers scenarios.

    it('does not emit when gameId is empty — Edge case', () => {
        service.emitPrivateGameLogToPlayers('', ['Alice'], 'Hello');

        expect(socketService.getNamespace.called).to.equal(false);
    });

    it('does not emit when message is whitespace only — Edge case', () => {
        service.emitPrivateGameLogToPlayers(GAME_ROOM_ID, ['Alice'], '   ');

        expect(socketService.getNamespace.called).to.equal(false);
    });

    it('does not emit when player list is empty — Edge case', () => {
        service.emitPrivateGameLogToPlayers(GAME_ROOM_ID, [], 'Hello');

        // Namespace lookup still occurs even when no player target is provided.
        expect(socketService.getNamespace.called).to.equal(true);
        // No socket receives a private log event.
        namespace.sockets.forEach((sock) => {
            expect(sock.emit.called).to.equal(false);
        });
    });

    it('emits only to sockets in the game room that belong to a target player — Nominal case', () => {
        const aliceEmit = sinon.stub();
        const bobEmit = sinon.stub();
        const carolEmit = sinon.stub();

        const aliceSocket = {
            rooms: new Set([GAME_ROOM_ID]),
            data: { playerNamesByGameId: { [GAME_ROOM_ID]: 'Alice' } } as ISocketData,
            emit: aliceEmit,
        };
        const bobSocket = {
            // Bob shares the room but is not part of the addressed target list.
            rooms: new Set([GAME_ROOM_ID]),
            data: { playerNamesByGameId: { [GAME_ROOM_ID]: 'Bob' } } as ISocketData,
            emit: bobEmit,
        };
        const carolSocket = {
            // Carol has a valid name mapping but is outside the room.
            rooms: new Set([OTHER_ROOM_ID]),
            data: { playerNamesByGameId: { [OTHER_ROOM_ID]: 'Carol' } } as ISocketData,
            emit: carolEmit,
        };

        namespace.sockets.set('socket-alice', aliceSocket as never);
        namespace.sockets.set('socket-bob', bobSocket as never);
        namespace.sockets.set('socket-carol', carolSocket as never);

        service.emitPrivateGameLogToPlayers(GAME_ROOM_ID, ['Alice'], 'Secret');

        expect(aliceEmit.calledOnceWithExactly(SocketEvent.GameLogPrivate, sinon.match({ message: 'Secret' }))).to.equal(true);
        expect(bobEmit.called).to.equal(false);
        expect(carolEmit.called).to.equal(false);
    });

    it('skips sockets whose playerNamesByGameId does not include the game — Edge case', () => {
        const socketEmit = sinon.stub();
        const sock = {
            rooms: new Set([GAME_ROOM_ID]),
            data: {} as ISocketData, // no playerNamesByGameId
            emit: socketEmit,
        };
        namespace.sockets.set('s1', sock as never);

        service.emitPrivateGameLogToPlayers(GAME_ROOM_ID, ['Alice'], 'Hello');

        expect(socketEmit.called).to.equal(false);
    });
});
