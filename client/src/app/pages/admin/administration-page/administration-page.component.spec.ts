/**
 * Testing strategy — Administration Page Component
 *
 * Approach:
 * - Treat the page as a facade-backed orchestrator and verify lifecycle delegation for init, refresh, and teardown.
 * - Assert local UI state transitions for the creation dialog independently from service interactions.
 * - Validate forwarding helpers for visibility state, toggle actions, and deletion requests with exact arguments.
 *
 * Edge cases covered:
 * - Errors from the games-modified stream are translated through `showServerMessage` with the admin-specific text.
 * - Pending/loading visibility states mirror facade responses used by toggle controls.
 * - Checkbox-based visibility events are passed through without mutating the original event target.
 */
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdministrationPageComponent } from '@app/pages/admin/administration-page/administration-page.component';
import { AdministrationPageFacadeService } from '@app/services/admin/administration-page.facade.service';
import { GameType, IExistingGame, Visibility } from '@common/game';
import { Subject } from 'rxjs';

describe('AdministrationPageComponent', () => {
    let fixture: ComponentFixture<AdministrationPageComponent>;
    let component: AdministrationPageComponent;
    let gamesModified$: Subject<void>;
    let facadeStub: {
        gameTableService: {
            isLoading: ReturnType<typeof signal<boolean>>;
            tableData: IExistingGame[];
        };
        initializePageData: jasmine.Spy;
        onGamesModified: jasmine.Spy;
        fetchGames: jasmine.Spy;
        connectSocket: jasmine.Spy;
        disconnectSocket: jasmine.Spy;
        showServerMessage: jasmine.Spy;
        gameIsViewable: jasmine.Spy;
        isVisibilityTogglePending: jasmine.Spy;
        isVisibilityToggleLoading: jasmine.Spy;
        toggleVisibility: jasmine.Spy;
        deleteGameAndHandleResult: jasmine.Spy;
    };

    const gameMock: IExistingGame = createGame('game-1', Visibility.Viewable);

    beforeEach(async () => {
        gamesModified$ = new Subject<void>();
        facadeStub = {
            gameTableService: {
                isLoading: signal(false),
                tableData: [gameMock],
            },
            initializePageData: jasmine.createSpy('initializePageData'),
            onGamesModified: jasmine.createSpy('onGamesModified').and.returnValue(gamesModified$.asObservable()),
            fetchGames: jasmine.createSpy('fetchGames'),
            connectSocket: jasmine.createSpy('connectSocket'),
            disconnectSocket: jasmine.createSpy('disconnectSocket'),
            showServerMessage: jasmine.createSpy('showServerMessage'),
            gameIsViewable: jasmine.createSpy('gameIsViewable').and.returnValue(true),
            isVisibilityTogglePending: jasmine.createSpy('isVisibilityTogglePending').and.returnValue(false),
            isVisibilityToggleLoading: jasmine.createSpy('isVisibilityToggleLoading').and.returnValue(false),
            toggleVisibility: jasmine.createSpy('toggleVisibility'),
            deleteGameAndHandleResult: jasmine.createSpy('deleteGameAndHandleResult'),
        };

        TestBed.overrideComponent(AdministrationPageComponent, { set: { template: '', imports: [] } });

        await TestBed.configureTestingModule({
            imports: [AdministrationPageComponent],
            providers: [{ provide: AdministrationPageFacadeService, useValue: facadeStub }],
        }).compileComponents();

        fixture = TestBed.createComponent(AdministrationPageComponent);
        component = fixture.componentInstance;
    });

    it('should open and close the creation dialog', () => {
        expect(component.isDialogOpen).toBeFalse();

        component.openDialog();
        expect(component.isDialogOpen).toBeTrue();

        component.closeDialog();
        expect(component.isDialogOpen).toBeFalse();
    });

    it('should initialize page data and react to game-modified socket events', () => {
        component.ngOnInit();

        expect(facadeStub.initializePageData).toHaveBeenCalled();
        expect(facadeStub.connectSocket).toHaveBeenCalled();

        gamesModified$.next();
        expect(facadeStub.fetchGames).toHaveBeenCalledTimes(1);

        const error = new HttpErrorResponse({ error: {} });
        gamesModified$.error(error);
        expect(facadeStub.showServerMessage).toHaveBeenCalledWith(error, "Il y a eu un problème lors de l'ajout des jeux.");
    });

    it('should disconnect socket on destroy', () => {
        component.ngOnDestroy();
        expect(facadeStub.disconnectSocket).toHaveBeenCalled();
    });

    // Edge case: Component helper should forward the exact game object to facade logic.
    it('delegates gameIsViewable to facade with the provided game', () => {
        const result = component.gameIsViewable(gameMock);
        expect(result).toBeTrue();
        expect(facadeStub.gameIsViewable).toHaveBeenCalledWith(gameMock);
    });

    it('should expose visibility toggle pending and disabled states from facade', () => {
        facadeStub.isVisibilityTogglePending.and.returnValue(true);

        expect(component.isVisibilityTogglePending(gameMock)).toBeTrue();
        expect(component.isVisibilityToggleDisabled(gameMock)).toBeTrue();
        expect(facadeStub.isVisibilityTogglePending).toHaveBeenCalledWith(gameMock._id);
    });

    it('should expose visibility loading state from facade', () => {
        facadeStub.isVisibilityToggleLoading.and.returnValue(true);
        expect(component.isVisibilityToggleLoading(gameMock, false)).toBeTrue();
        expect(facadeStub.isVisibilityToggleLoading).toHaveBeenCalledWith(gameMock, false);
    });

    it('should delegate visibility toggling with checkbox input event target', () => {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = true;

        component.toggleVisibility({ target: input } as unknown as Event, gameMock);

        expect(facadeStub.toggleVisibility).toHaveBeenCalledWith(input, gameMock);
    });

    it('should delegate deletion to facade', () => {
        component.deleteGame(gameMock);
        expect(facadeStub.deleteGameAndHandleResult).toHaveBeenCalledWith(gameMock);
    });
});

function createGame(id: string, visibility: Visibility): IExistingGame {
    return {
        _id: id,
        gameTitle: 'Game',
        description: 'Description',
        board: {
            cells: [[]],
            items: [],
        },
        gameMode: GameType.Classic,
        visibility,
        dateCreated: new Date('2026-01-01T00:00:00.000Z'),
        lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
    };
}
