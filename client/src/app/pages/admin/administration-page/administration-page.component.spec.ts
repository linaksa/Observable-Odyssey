/**
 * Testing strategy — Administration Page Component
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
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed } from '@angular/core/testing';
import { AdministrationService } from '@app/services/admin/administration.service';
import { GameService } from '@app/services/admin/game.service';
import { AdminSocketService } from '@app/services/realtime/admin.socket.service';
import { GameTableService } from '@app/services/tables/game-table.service';
import { ToastService } from '@app/services/ui/toast.service';
import { ErrorCode } from '@common/error-codes';
import { GameType, IExistingGame, Visibility } from '@common/game';
import { of, Subject, throwError } from 'rxjs';
import { AdministrationPageComponent } from './administration-page.component';
import SpyObj = jasmine.SpyObj;

const FETCH_ALL_GAMES = false;

describe('AdministrationPageComponent', () => {
    let component: AdministrationPageComponent;
    let fixture: ComponentFixture<AdministrationPageComponent>;

    let administrationServiceSpy: SpyObj<AdministrationService>;
    let gameServiceSpy: SpyObj<GameService>;
    let toastServiceSpy: SpyObj<ToastService>;
    let adminSocketServiceSpy: SpyObj<AdminSocketService>;
    let gameTableServiceSpy: SpyObj<GameTableService>;
    let gameTableLoadingSignal = signal(false);

    const gameMock: IExistingGame = {
        _id: 'game-1',
        gameTitle: 'Game 1',
        description: 'desc',
        board: { cells: [[]], items: [] },
        gameMode: GameType.Classic,
        lastModifiedDate: new Date('2024-01-01'),
        visibility: Visibility.Viewable,
        dateCreated: new Date('2024-01-01'),
    };

    beforeEach(async () => {
        gameTableLoadingSignal = signal(false);

        administrationServiceSpy = jasmine.createSpyObj('AdministrationService', ['changeGameVisibility']);
        gameServiceSpy = jasmine.createSpyObj('GameService', ['deleteGame']);
        toastServiceSpy = jasmine.createSpyObj('ToastService', ['show']);
        adminSocketServiceSpy = jasmine.createSpyObj('AdminSocketService', ['connect', 'onGamesModified']);
        adminSocketServiceSpy.onGamesModified.and.returnValue(of(void 0));

        gameTableServiceSpy = jasmine.createSpyObj('GameTableService', ['fetchGames']);
        Object.defineProperty(gameTableServiceSpy, 'tableData', {
            value: [gameMock],
            writable: true,
            configurable: true,
        });
        Object.defineProperty(gameTableServiceSpy, 'isLoading', {
            value: gameTableLoadingSignal,
            configurable: true,
        });

        const overrideInfo: MetadataOverride<Component> = {
            set: {
                template: '',
                imports: [],
            },
        };
        TestBed.overrideComponent(AdministrationPageComponent, overrideInfo);

        await TestBed.configureTestingModule({
            imports: [AdministrationPageComponent],
            providers: [
                { provide: AdministrationService, useValue: administrationServiceSpy },
                { provide: GameService, useValue: gameServiceSpy },
                { provide: ToastService, useValue: toastServiceSpy },
                { provide: AdminSocketService, useValue: adminSocketServiceSpy },
                { provide: GameTableService, useValue: gameTableServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AdministrationPageComponent);
        component = fixture.componentInstance;
    });

    it('should allow toggling a row even while table refresh is loading', () => {
        gameTableLoadingSignal.set(true);
        const changeVisibility$ = new Subject<HttpResponse<string>>();
        const input = createCheckboxEventTarget(true);
        administrationServiceSpy.changeGameVisibility.and.returnValue(changeVisibility$.asObservable());

        component.toggleVisibility(createChangeEvent(input), gameMock);

        expect(administrationServiceSpy.changeGameVisibility).toHaveBeenCalledTimes(1);

        changeVisibility$.complete();
    });

    // Edge case: When a visibility update is already pending, repeated toggle attempts should be ignored.
    it('should block repeated toggles while visibility update is in progress', () => {
        const changeVisibility$ = new Subject<HttpResponse<string>>();
        const input = createCheckboxEventTarget(true);

        administrationServiceSpy.changeGameVisibility.and.returnValue(changeVisibility$.asObservable());
        component.toggleVisibility(createChangeEvent(input), gameMock);
        component.toggleVisibility(createChangeEvent(input), gameMock);

        expect(administrationServiceSpy.changeGameVisibility).toHaveBeenCalledTimes(1);
        expect(component.isVisibilityTogglePending(gameMock)).toBeTrue();
        expect(component.isVisibilityToggleDisabled(gameMock)).toBeTrue();

        changeVisibility$.next(new HttpResponse<string>({ status: 200 }));
        changeVisibility$.complete();

        expect(gameTableServiceSpy.fetchGames).toHaveBeenCalledWith(FETCH_ALL_GAMES);
        expect(component.isVisibilityTogglePending(gameMock)).toBeFalse();
        expect(component.isVisibilityToggleDisabled(gameMock)).toBeFalse();
    });

    it('should keep spinner visible while checkbox state differs from persisted visibility', () => {
        expect(component.isVisibilityToggleLoading(gameMock, false)).toBeTrue();
        expect(component.isVisibilityToggleLoading(gameMock, true)).toBeFalse();
    });

    it('should open and close the creation dialog', () => {
        expect(component.isDialogOpen).toBeFalse();

        component.openDialog();
        expect(component.isDialogOpen).toBeTrue();

        component.closeDialog();
        expect(component.isDialogOpen).toBeFalse();
    });

    it('should initialize page data and react to game-modified socket events', () => {
        const gamesModified$ = new Subject<void>();
        adminSocketServiceSpy.onGamesModified.and.returnValue(gamesModified$.asObservable());
        gameTableServiceSpy.tableData = [gameMock];

        component.ngOnInit();

        expect(gameTableServiceSpy.tableData).toEqual([]);
        expect(adminSocketServiceSpy.connect).toHaveBeenCalled();
        expect(gameTableServiceSpy.fetchGames).toHaveBeenCalledWith(FETCH_ALL_GAMES);

        gamesModified$.next();
        expect(gameTableServiceSpy.fetchGames).toHaveBeenCalledTimes(2);

        gamesModified$.error(new HttpErrorResponse({ error: {} }));
        expect(toastServiceSpy.show).toHaveBeenCalledWith("Il y a eu un problème lors de l'ajout des jeux.");
    });

    it('should remove deleted game from table data on successful deletion', () => {
        const secondGame = { ...gameMock, _id: 'game-2' };
        gameTableServiceSpy.tableData = [gameMock, secondGame];
        gameServiceSpy.deleteGame.and.returnValue(of(new HttpResponse<string>({ status: 200 })));

        component.deleteGame(gameMock);

        expect(gameTableServiceSpy.tableData).toEqual([secondGame]);
    });

    it('should show server delete error message when provided', () => {
        gameServiceSpy.deleteGame.and.returnValue(
            throwError(() => new HttpErrorResponse({ error: { errorCodes: [ErrorCode.InternalServerError] } })),
        );

        component.deleteGame(gameMock);

        expect(toastServiceSpy.show).toHaveBeenCalledWith('Erreur interne du serveur');
    });

    it('should show fallback delete error message when server message is missing', () => {
        gameServiceSpy.deleteGame.and.returnValue(throwError(() => new HttpErrorResponse({ error: {} })));

        component.deleteGame(gameMock);

        expect(toastServiceSpy.show).toHaveBeenCalledWith('Il y a eu un problème lors de la suppression.');
    });

    // Edge case: When visibility update fails, revert checkbox and show toast.
    it('should revert checkbox and show toast when visibility update fails', () => {
        const changeVisibility$ = new Subject<HttpResponse<string>>();
        const input = createCheckboxEventTarget(true);

        administrationServiceSpy.changeGameVisibility.and.returnValue(changeVisibility$.asObservable());

        component.toggleVisibility(createChangeEvent(input), gameMock);
        changeVisibility$.error(new Error('boom'));

        expect(input.checked).toBeFalse();
        expect(toastServiceSpy.show).toHaveBeenCalledWith('Il y a eu un problème lors du changement de visibilité.');
        expect(component.isVisibilityTogglePending(gameMock)).toBeFalse();
    });
});

function createCheckboxEventTarget(checked: boolean): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    return input;
}

function createChangeEvent(target: HTMLInputElement): Event {
    return { target } as unknown as Event;
}
