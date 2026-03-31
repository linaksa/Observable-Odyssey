/**
 * Testing strategy — Join Form Page Component
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
import { Component, EventEmitter, Output, signal } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, Subject, Subscription, throwError } from 'rxjs';

import { CharacterFormData, ICharacter } from '@common/character';
import { JoinFormPageComponent } from './join-form-page.component';

import { GameService } from '@app/services/admin/game.service';
import { CharacterFormService } from '@app/services/forms/character-form.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { ToastService } from '@app/services/ui/toast.service';
import { IActiveGame, IActiveGameWithPlayer } from '@common/activeGame';
import { Avatar, DiceType } from '@common/constants';
import { IGame } from '@common/game';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';

@Component({
    selector: 'app-character-form',
    standalone: true,
    template: '',
})
class MockCharacterFormComponent {
    @Output() submitForm = new EventEmitter<CharacterFormData>();
}

@Component({
    selector: 'app-toast',
    standalone: true,
    template: '',
})
class MockToastComponent {}

const defaultActiveGameID = 'game123';

const dummyActiveGame: IActiveGame = {
    _id: 'dummyActiveGameId',
    game: {} as IGame,
    players: [],
    currentPlayerIndex: 0,
    turnOrder: [],
    isFinished: false,
    winner: null,
    messages: [],
    isDebugMode: false,
    organizerName: 'Dummy Organizer',
    maxPlayerCount: 4,
    turnIsInPreparation: false,

    turnStartTimeStamp: 0,
    currentAttack: null,
};

describe('JoinFormPageComponent', () => {
    let component: JoinFormPageComponent;
    let fixture: ComponentFixture<JoinFormPageComponent>;

    let characterFormServiceMock: jasmine.SpyObj<CharacterFormService>;
    let socketServiceMock: jasmine.SpyObj<SocketService>;
    let gameServiceMock: jasmine.SpyObj<GameService>;
    let toastServiceMock: jasmine.SpyObj<ToastService>;
    let localPlayerServiceMock: jasmine.SpyObj<LocalPlayerService>;
    let routerMock: jasmine.SpyObj<Router>;

    const socketSubject = new Subject<string>();

    beforeEach(async () => {
        characterFormServiceMock = jasmine.createSpyObj('CharacterFormService', ['joinActiveGameWithCharacter'], {
            unavailableAvatars: signal([]),
            isLoading: signal(false),
            errors: signal(null),
        });

        socketServiceMock = jasmine.createSpyObj('SocketService', ['on', 'connect']);
        gameServiceMock = jasmine.createSpyObj('GameService', ['getActiveGameById']);
        toastServiceMock = jasmine.createSpyObj('ToastService', ['show']);
        localPlayerServiceMock = jasmine.createSpyObj('LocalPlayerService', ['setLocalPlayer']);
        routerMock = jasmine.createSpyObj('Router', ['navigate']);

        gameServiceMock.getActiveGameById.and.returnValue(of(dummyActiveGame));

        socketServiceMock.on.and.returnValue(socketSubject.asObservable());

        const overrideInfo: MetadataOverride<Component> = {
            set: { imports: [MockCharacterFormComponent, MockToastComponent] },
        };

        TestBed.overrideComponent(JoinFormPageComponent, overrideInfo);

        await TestBed.configureTestingModule({
            imports: [JoinFormPageComponent],
            providers: [
                provideRouter([]),

                { provide: CharacterFormService, useValue: characterFormServiceMock },
                { provide: SocketService, useValue: socketServiceMock },
                { provide: GameService, useValue: gameServiceMock },
                { provide: ToastService, useValue: toastServiceMock },
                { provide: LocalPlayerService, useValue: localPlayerServiceMock },
                { provide: Router, useValue: routerMock },

                {
                    provide: ActivatedRoute,
                    useValue: {
                        params: of({ activeGameId: defaultActiveGameID }),
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(JoinFormPageComponent);
        component = fixture.componentInstance;
    });

    it('should fetch available avatars on init', () => {
        const spy = spyOn(component, 'fetchAvailableAvatars').and.stub();

        fixture.detectChanges();

        expect(spy).toHaveBeenCalled();
    });

    // Edge case: When activeGameId is missing, it should not fetch avatars.
    it('should not fetch avatars if activeGameId is missing', () => {
        gameServiceMock.getActiveGameById.calls.reset();

        component.activeGameId = null;
        component.fetchAvailableAvatars();

        expect(gameServiceMock.getActiveGameById).not.toHaveBeenCalled();
    });

    it('should subscribe to socket updates on init', () => {
        fixture.detectChanges();

        expect(socketServiceMock.on).toHaveBeenCalledWith(Namespaces.ActiveGameAdmin, SocketEvent.JoinableGamesUpdated);
    });

    it('should refresh avatars only when socket update matches current game id', () => {
        const fetchSpy = spyOn(component, 'fetchAvailableAvatars').and.callThrough();

        component.ngOnInit();
        fetchSpy.calls.reset();

        socketSubject.next(defaultActiveGameID);
        socketSubject.next('another-game');

        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should set activeGameId to null when route params are missing activeGameId', () => {
        const fetchSpy = spyOn(component, 'fetchAvailableAvatars').and.stub();
        component.router = { params: of({}) } as ActivatedRoute;

        component.ngOnInit();

        expect(component.activeGameId).toBeNull();
        expect(fetchSpy).toHaveBeenCalled();
    });

    it('should ignore abandoned players when computing unavailable avatars', () => {
        const unavailableAvatarsSet = jasmine.createSpy('set');
        Object.defineProperty(characterFormServiceMock, 'unavailableAvatars', {
            value: { set: unavailableAvatarsSet },
            configurable: true,
        });

        const activeGameWithAbandonedPlayers: IActiveGame = {
            ...dummyActiveGame,
            players: [
                {
                    name: 'active-player',
                    avatar: Avatar.Avatar1,
                    initialHealth: 1,
                    currentHealth: 1,
                    attackBonusDiceType: DiceType.FourSided,
                    defenseBonusDiceType: DiceType.SixSided,
                    rapidityPoints: 1,
                    attackPoints: 1,
                    defensePoints: 1,
                    actionsLeft: 1,
                    movementLeft: 1,
                    victories: 0,
                    hasAbandoned: false,
                    positionDepart: { x: 0, y: 0 },
                    positionGrille: { x: 0, y: 0 },
                },
                {
                    name: 'abandoned-player',
                    avatar: Avatar.Avatar2,
                    initialHealth: 1,
                    currentHealth: 1,
                    attackBonusDiceType: DiceType.FourSided,
                    defenseBonusDiceType: DiceType.SixSided,
                    rapidityPoints: 1,
                    attackPoints: 1,
                    defensePoints: 1,
                    actionsLeft: 1,
                    movementLeft: 1,
                    victories: 0,
                    hasAbandoned: true,
                    positionDepart: { x: 0, y: 0 },
                    positionGrille: { x: 0, y: 0 },
                },
            ],
        };

        gameServiceMock.getActiveGameById.and.returnValue(of(activeGameWithAbandonedPlayers));
        component.activeGameId = defaultActiveGameID;

        component.fetchAvailableAvatars();

        expect(unavailableAvatarsSet).toHaveBeenCalledWith([Avatar.Avatar1]);
    });

    it('should handle joinGameAsCharacter success', () => {
        // Nominal case
        // test that when joinGameAsCharacter succeeds, the flow is correctly executed
        // the flow is: show toast, set local player, navigate to wait page

        const response: IActiveGameWithPlayer = {
            player: {} as ICharacter,
            activeGame: dummyActiveGame,
        };

        characterFormServiceMock.joinActiveGameWithCharacter.and.returnValue(of(response));

        component.activeGameId = defaultActiveGameID;

        component.joinGameAsCharacter({} as CharacterFormData);

        expect(localPlayerServiceMock.setLocalPlayer).toHaveBeenCalledWith(response.player);
        expect(routerMock.navigate).toHaveBeenCalledWith(['/wait', dummyActiveGame._id]);
    });

    // Edge case: When joinGameAsCharacter fails, the page should surface an error toast and keep form error state consistent.
    it('should handle joinGameAsCharacter error', () => {
        // Error case
        // Validate that the app doesnt crash and shows an error toast when the join game request fails
        const errorText = 'join failed';

        const error = {
            originalError: {
                error: { message: errorText },
            },
        };

        characterFormServiceMock.joinActiveGameWithCharacter.and.returnValue(throwError(() => error));

        component.activeGameId = defaultActiveGameID;

        component.joinGameAsCharacter({} as CharacterFormData);

        expect(toastServiceMock.show).toHaveBeenCalled();
        expect(characterFormServiceMock.errors()).toBe(errorText);
    });

    // Edge case: When required input data is missing, handle joinGameAsCharacter empty error.
    it('should handle joinGameAsCharacter empty error', () => {
        const error = {
            originalError: {
                error: {},
            },
        };

        characterFormServiceMock.joinActiveGameWithCharacter.and.returnValue(throwError(() => error));

        component.activeGameId = defaultActiveGameID;

        component.joinGameAsCharacter({} as CharacterFormData);

        expect(toastServiceMock.show).toHaveBeenCalled();
        expect(characterFormServiceMock.errors()).toBeTruthy();
    });

    // Edge case: When joining, show error if activeGameId missing.
    it('should show error if activeGameId missing when joining', () => {
        // Edge case
        // Validate that the app shows an error toast if the activeGameId is missing when trying to join a game

        component.activeGameId = null;
        component.joinGameAsCharacter({} as CharacterFormData);
        expect(toastServiceMock.show).toHaveBeenCalled();
    });

    // Edge case: When the component is destroyed, active subscriptions should be unsubscribed to prevent leaks.
    it('should unsubscribe on destroy', () => {
        // Nominal case
        // Make sure that no memory leaks happen when the component is destroyed

        component.ngOnInit();

        const unsubscribeSpy = spyOn(component['socketSubscription'] as Subscription, 'unsubscribe');

        component.ngOnDestroy();
        expect(unsubscribeSpy).toHaveBeenCalled();
    });
});
