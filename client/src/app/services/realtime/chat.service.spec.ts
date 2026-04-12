/**
 * Testing strategy — Chat Service
 *
 * Approach:
 * - Keep each test focused on one behavior with deterministic mocks/spies.
 * - Validate both nominal flows and failure paths that could break UX/state.
 * - Assert side effects explicitly (state changes, emitted events, and service calls).
 *
 * Edge cases covered:
 * - Missing or invalid input guards and safe early returns.
 * - Error handling paths and fallback user-facing messaging.
 * - Cleanup/teardown behavior (unsubscribe/reset/disconnect) when applicable.
 */
import { TestBed } from '@angular/core/testing';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { IActiveGame } from '@common/activeGame';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { IMessage, INewMessage } from '@common/message';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Subject } from 'rxjs';
import { ChatService } from './chat.service';
import { SocketService } from './socket.service';

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
            activeGameServiceStub.activeGame._id,
            jasmine.any(Function),
        );
        expect(activeGameServiceStub.activeGame.messages).toEqual(expectedMessages);
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
