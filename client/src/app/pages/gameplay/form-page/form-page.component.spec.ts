/**
 * Testing strategy — Form Page Component
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
import { of, throwError } from 'rxjs';

import { FormPageComponent } from './form-page.component';

import { CharacterFormService } from '@app/services/forms/character-form.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { ToastService } from '@app/services/ui/toast.service';

import { IActiveGame } from '@common/activeGame';
import { CharacterFormData, ICharacter } from '@common/character';
import { IGame } from '@common/game';

@Component({
    selector: 'app-character-form',
    standalone: true,
    template: '',
})
class MockCharacterFormComponent {
    @Output() submitForm = new EventEmitter<CharacterFormData>();
}

@Component({
    selector: 'app-form-page-header',
    standalone: true,
    template: '',
})
class MockHeaderComponent {}

@Component({
    selector: 'app-toast',
    standalone: true,
    template: '',
})
class MockToastComponent {}

const defaultGameId = 'game123';

describe('FormPageComponent', () => {
    let component: FormPageComponent;
    let fixture: ComponentFixture<FormPageComponent>;

    let characterFormServiceMock: jasmine.SpyObj<CharacterFormService>;
    let toastServiceMock: jasmine.SpyObj<ToastService>;
    let localPlayerServiceMock: jasmine.SpyObj<LocalPlayerService>;
    let routerMock: jasmine.SpyObj<Router>;

    beforeEach(async () => {
        characterFormServiceMock = jasmine.createSpyObj('CharacterFormService', ['createActiveGameWithCharacter'], {
            isLoading: signal(false),
            errors: signal(null),
        });

        toastServiceMock = jasmine.createSpyObj('ToastService', ['show']);
        localPlayerServiceMock = jasmine.createSpyObj('LocalPlayerService', ['setLocalPlayer']);
        routerMock = jasmine.createSpyObj('Router', ['navigate']);

        const overrideInfo: MetadataOverride<Component> = {
            set: {
                imports: [MockHeaderComponent, MockCharacterFormComponent, MockToastComponent],
            },
        };

        TestBed.overrideComponent(FormPageComponent, overrideInfo);

        await TestBed.configureTestingModule({
            imports: [FormPageComponent],
            providers: [
                provideRouter([]),

                { provide: CharacterFormService, useValue: characterFormServiceMock },
                { provide: ToastService, useValue: toastServiceMock },
                { provide: LocalPlayerService, useValue: localPlayerServiceMock },
                { provide: Router, useValue: routerMock },

                {
                    provide: ActivatedRoute,
                    useValue: {
                        params: of({ gameId: defaultGameId }),
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(FormPageComponent);
        component = fixture.componentInstance;
    });

    it('should read gameId from route params on init', () => {
        // Nominal case
        // Validate that the gameId is correctly get from the route

        fixture.detectChanges();
        expect(component.gameId).toBe(defaultGameId);
    });

    it('should set gameId to null when route params do not include it', () => {
        component.router = { params: of({}) } as ActivatedRoute;

        component.ngOnInit();

        expect(component.gameId).toBeNull();
    });

    // Edge case: When gameId is missing on submit, show error.
    it('should show error if gameId is missing on submit', () => {
        // Edge case
        // Validate that the app shows an error toast if the gameId is missing when trying to submit the character form
        component.gameId = null;
        component.submitCharacterForm({} as CharacterFormData);
        expect(toastServiceMock.show).toHaveBeenCalled();
    });

    it('should create character and navigate on success', () => {
        // Nominal case
        // Validate that the character is created and the user is navigated to the waiting room on successful form submission

        const mockActiveGame: IActiveGame = {
            _id: 'activeGame1',
            game: {} as IGame,
            players: [],
            currentPlayerIndex: 0,
            turnOrder: [],
            isFinished: false,
            winner: null,
            messages: [],
            isDebugMode: false,
            organizerName: '',
            maxPlayerCount: 4,
            turnIsInPreparation: false,

            turnStartTimeStamp: 0,
            currentAttack: null,
        };

        const response = {
            player: {} as ICharacter,
            activeGame: mockActiveGame,
        };

        characterFormServiceMock.createActiveGameWithCharacter.and.returnValue(of(response));

        component.gameId = defaultGameId;

        component.submitCharacterForm({} as CharacterFormData);

        expect(characterFormServiceMock.isLoading()).toBeFalse();
        expect(localPlayerServiceMock.setLocalPlayer).toHaveBeenCalledWith(response.player);
        expect(routerMock.navigate).toHaveBeenCalledWith(['/wait', mockActiveGame._id]);
    });

    // Edge case: When creating character, handle error.
    it('should handle error when creating character', () => {
        // Error case
        // Validate that the app correctly handles errors when the character creation fails, and shows an error message to the user

        const error = {
            originalError: {
                error: {
                    message: 'creation failed',
                },
            },
        };

        characterFormServiceMock.createActiveGameWithCharacter.and.returnValue(throwError(() => error));

        component.gameId = defaultGameId;

        component.submitCharacterForm({} as CharacterFormData);

        expect(characterFormServiceMock.isLoading()).toBeFalse();
        expect(characterFormServiceMock.errors()).toBe('creation failed');
    });

    // Edge case: When required input data is missing, handle error with empty message.
    it('should handle error with empty message', () => {
        // Edge case
        // Validate that the app doesnt crashes and shows a generic error when the server give an empty error
        const error = {
            originalError: {
                error: {},
            },
        };

        characterFormServiceMock.createActiveGameWithCharacter.and.returnValue(throwError(() => error));

        component.gameId = defaultGameId;

        component.submitCharacterForm({} as CharacterFormData);

        expect(characterFormServiceMock.errors()).toBeTruthy();
    });
});
