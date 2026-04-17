/**
 * Testing strategy — ChatService
 *
 * Approach:
 * - Drive chat room lifecycle through mocked SocketService streams and LocalPlayerService values.
 * - Assert join payload composition, history hydration, inbound message handling, and local message emission.
 *
 * Edge cases covered:
 * - Reconnect unsubscribes previous listeners before attaching new streams.
 * - Late events from an outdated active game id are ignored to prevent message leakage.
 */
import { TestBed } from '@angular/core/testing';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { ChatService } from '@app/services/realtime/chat.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/active-game';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { IMessage, INewMessage } from '@common/message';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { IJoinChatPayload } from '@common/socket-payloads';
import { Subject } from 'rxjs';

describe('ChatService', () => {
    let service: ChatService;
    let socketServiceSpy: jasmine.SpyObj<SocketService>;
    let localPlayerServiceSpy: jasmine.SpyObj<LocalPlayerService>;
    let activeGameServiceStub: {
        activeGame: IActiveGame;
        setChatMessages: (messages: IMessage[]) => void;
        appendChatMessage: (message: IMessage) => void;
    };

    beforeEach(() => {
        socketServiceSpy = jasmine.createSpyObj<SocketService>('SocketService', ['connect', 'emit', 'on']);
        localPlayerServiceSpy = jasmine.createSpyObj<LocalPlayerService>('LocalPlayerService', ['getLocalPlayer']);
        activeGameServiceStub = {
            activeGame: createActiveGame('active-game-1'),
            setChatMessages: (messages: IMessage[]) => {
                activeGameServiceStub.activeGame.messages = [...messages];
            },
            appendChatMessage: (message: IMessage) => {
                activeGameServiceStub.activeGame.messages = [...activeGameServiceStub.activeGame.messages, message];
            },
        };

        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Alice'));
        socketServiceSpy.on.and.returnValue(new Subject<IMessage>().asObservable());

        TestBed.configureTestingModule({
            providers: [
                ChatService,
                { provide: SocketService, useValue: socketServiceSpy },
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
            ],
        });
        service = TestBed.inject(ChatService);
    });

    it('should connect, join chat room and append incoming messages', () => {
        const incomingMessages$ = new Subject<IMessage>();
        const history = [createMessage('System', 'Bienvenue')];
        const newMessage = createMessage('Bob', 'Salut');
        const expectedMessages = [...history, newMessage];
        socketServiceSpy.on.and.returnValue(incomingMessages$.asObservable());

        service.connect();
        const joinCallback = socketServiceSpy.emit.calls.mostRecent().args[3] as (response: IMessage[]) => void;
        joinCallback(history);
        incomingMessages$.next(newMessage);

        expect(socketServiceSpy.connect).toHaveBeenCalledWith(Namespaces.Game);
        expect(socketServiceSpy.emit).toHaveBeenCalledWith(
            Namespaces.Game,
            SocketEvent.JoinChat,
            {
                roomId: activeGameServiceStub.activeGame._id,
                playerName: 'Alice',
            },
            jasmine.any(Function),
        );
        expect(activeGameServiceStub.activeGame.messages).toEqual(expectedMessages);
    });

    // Edge case: When no local player is available, only roomId should be emitted.
    it('should emit join chat payload without playerName when local player is unavailable', () => {
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(undefined);

        service.connect();

        const emittedPayload = socketServiceSpy.emit.calls.mostRecent().args[2] as IJoinChatPayload;
        expect(emittedPayload).toEqual({
            roomId: activeGameServiceStub.activeGame._id,
        });
        expect(emittedPayload.playerName).toBeUndefined();
    });

    // Edge case: When reconnecting, unsubscribe previous chat stream.
    it('should unsubscribe previous chat stream when reconnecting', () => {
        const firstStream$ = new Subject<IMessage>();
        const secondStream$ = new Subject<IMessage>();
        socketServiceSpy.on.and.returnValues(firstStream$.asObservable(), secondStream$.asObservable());
        activeGameServiceStub.activeGame.messages = [];

        service.connect();
        service.connect();
        firstStream$.next(createMessage('Old', 'Ignored'));
        secondStream$.next(createMessage('New', 'Kept'));

        expect(activeGameServiceStub.activeGame.messages).toEqual([createMessage('New', 'Kept')]);
    });

    it('should ignore joined history callback when active game changed after connect', () => {
        // Edge case: stale join callback must not overwrite another room state.
        spyOn(activeGameServiceStub, 'setChatMessages').and.callThrough();

        service.connect();
        const joinCallback = socketServiceSpy.emit.calls.mostRecent().args[3] as (response: IMessage[]) => void;
        activeGameServiceStub.activeGame = createActiveGame('other-room');

        joinCallback([createMessage('System', 'Old room history')]);

        expect(activeGameServiceStub.setChatMessages).not.toHaveBeenCalled();
    });

    it('should ignore incoming messages when active game changed after connect', () => {
        // Edge case: stale message stream must be ignored after room switch.
        const incomingMessages$ = new Subject<IMessage>();
        socketServiceSpy.on.and.returnValue(incomingMessages$.asObservable());
        spyOn(activeGameServiceStub, 'appendChatMessage').and.callThrough();

        service.connect();
        activeGameServiceStub.activeGame = createActiveGame('other-room');
        incomingMessages$.next(createMessage('Bob', 'should be ignored'));

        expect(activeGameServiceStub.appendChatMessage).not.toHaveBeenCalled();
        expect(activeGameServiceStub.activeGame.messages).toEqual([]);
    });

    it('should emit new message payload and append local message', () => {
        service.sendMessage('Bonjour');

        const emittedPayload = socketServiceSpy.emit.calls.mostRecent().args[2] as INewMessage;
        const appendedMessage = activeGameServiceStub.activeGame.messages[0];

        expect(emittedPayload).toEqual({
            content: 'Bonjour',
            roomId: activeGameServiceStub.activeGame._id,
            author: 'Alice',
        });
        expect(appendedMessage.content).toBe('Bonjour');
        expect(appendedMessage.author).toBe('Alice');
        expect(appendedMessage.postedAt instanceof Date).toBeTrue();
    });

    // Edge case: When no local player is available, fall back to ERROR author.
    it('should fallback to ERROR author when no local player is available', () => {
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(undefined);
        activeGameServiceStub.activeGame.messages = [];

        service.sendMessage('Hello');

        const emittedPayload = socketServiceSpy.emit.calls.mostRecent().args[2] as INewMessage;
        expect(emittedPayload.author).toBe('ERROR');
        expect(activeGameServiceStub.activeGame.messages[0].author).toBe('ERROR');
    });

    // Edge case: When the chat service is destroyed, its chat stream subscription should be unsubscribed.
    it('should unsubscribe from chat stream on destroy', () => {
        const stream$ = new Subject<IMessage>();
        socketServiceSpy.on.and.returnValue(stream$.asObservable());
        activeGameServiceStub.activeGame.messages = [];

        service.connect();
        service.ngOnDestroy();
        stream$.next(createMessage('Bob', 'After destroy'));

        expect(activeGameServiceStub.activeGame.messages).toEqual([]);
    });
});

function createActiveGame(id: string): IActiveGame {
    return {
        _id: id,
        messages: [],
    } as unknown as IActiveGame;
}

function createMessage(author: string, content: string): IMessage {
    return {
        author,
        content,
        postedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
}

function createCharacter(name: string): ICharacter {
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
    };
}
