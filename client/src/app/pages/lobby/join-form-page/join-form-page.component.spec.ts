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

import { CharacterFormService } from '@app/services/forms/character-form.service';
import { GameService } from '@app/services/admin/game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { ToastService } from '@app/services/ui/toast.service';
import { IActiveGame, IActiveGameWithPlayer } from '@common/activeGame';
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

    const socketSubject = new Subject<IActiveGame>();

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

    // Edge case: should not fetch avatars if activeGameId is missing.
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

    // Edge case: should handle joinGameAsCharacter error.
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

    // Edge case: should handle joinGameAsCharacter empty error.
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

    // Edge case: should show error if activeGameId missing when joining.
    it('should show error if activeGameId missing when joining', () => {
        // Edge case
        // Validate that the app shows an error toast if the activeGameId is missing when trying to join a game

        component.activeGameId = null;
        component.joinGameAsCharacter({} as CharacterFormData);
        expect(toastServiceMock.show).toHaveBeenCalled();
    });

    // Edge case: should unsubscribe on destroy.
    it('should unsubscribe on destroy', () => {
        // Nominal case
        // Make sure that no memory leaks happen when the component is destroyed

        component.ngOnInit();

        const unsubscribeSpy = spyOn(component['socketSubscription'] as Subscription, 'unsubscribe');

        component.ngOnDestroy();
        expect(unsubscribeSpy).toHaveBeenCalled();
    });
});
