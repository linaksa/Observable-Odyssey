/**
 * Testing strategy — AdministrationPageFacadeService
 *
 * Approach:
 * - Treat the facade as an orchestration layer and assert delegation to table, admin, and socket services.
 * - Validate visibility-toggle and delete flows by checking pending flags, refresh calls, and toast/error behavior.
 *
 * Edge cases covered:
 * - Duplicate visibility requests are ignored while the same game is pending.
 * - Failed visibility updates revert UI state and surface mapped fallback error messages.
 */
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { AdministrationPageFacadeService } from '@app/services/admin/administration-page.facade.service';
import { AdministrationService } from '@app/services/admin/administration.service';
import { GameService } from '@app/services/admin/game.service';
import { AdminSocketService } from '@app/services/realtime/admin.socket.service';
import { GameTableService } from '@app/services/tables/game-table.service';
import { ToastService } from '@app/services/ui/toast.service';
import { CellType } from '@common/board';
import { ErrorCode } from '@common/error-codes';
import { GameType, IExistingGame, Visibility } from '@common/game';
import { Observable, Subject, of, throwError } from 'rxjs';

describe('AdministrationPageFacadeService', () => {
    let service: AdministrationPageFacadeService;
    let gameTableServiceStub: { tableData: IExistingGame[]; fetchGames: jasmine.Spy };
    let adminServiceSpy: jasmine.SpyObj<AdministrationService>;
    let gameServiceSpy: jasmine.SpyObj<GameService>;
    let toastServiceSpy: jasmine.SpyObj<ToastService>;
    let adminSocketServiceSpy: jasmine.SpyObj<AdminSocketService>;
    let gamesModified$: Subject<void>;

    beforeEach(() => {
        gameTableServiceStub = {
            tableData: [createGame('g-legacy')],
            fetchGames: jasmine.createSpy('fetchGames'),
        };
        adminServiceSpy = jasmine.createSpyObj<AdministrationService>('AdministrationService', ['changeGameVisibility']);
        gameServiceSpy = jasmine.createSpyObj<GameService>('GameService', ['deleteGame']);
        toastServiceSpy = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
        adminSocketServiceSpy = jasmine.createSpyObj<AdminSocketService>('AdminSocketService', ['connect', 'disconnect', 'onGamesModified']);

        gamesModified$ = new Subject<void>();
        adminSocketServiceSpy.onGamesModified.and.returnValue(gamesModified$ as unknown as Observable<void>);

        TestBed.configureTestingModule({
            providers: [
                AdministrationPageFacadeService,
                { provide: GameTableService, useValue: gameTableServiceStub },
                { provide: AdministrationService, useValue: adminServiceSpy },
                { provide: GameService, useValue: gameServiceSpy },
                { provide: ToastService, useValue: toastServiceSpy },
                { provide: AdminSocketService, useValue: adminSocketServiceSpy },
            ],
        });

        service = TestBed.inject(AdministrationPageFacadeService);
    });

    it('initializes page data and delegates socket helpers', () => {
        // Nominal case
        service.initializePageData();
        service.connectSocket();
        service.disconnectSocket();

        expect(gameTableServiceStub.tableData).toEqual([]);
        expect(gameTableServiceStub.fetchGames).toHaveBeenCalledWith(false);
        expect(adminSocketServiceSpy.connect).toHaveBeenCalled();
        expect(adminSocketServiceSpy.disconnect).toHaveBeenCalled();
        expect(service.onGamesModified()).toBe(gamesModified$ as unknown as Observable<void>);
    });

    it('delegates fetch/delete/visibility calls', () => {
        // Nominal case
        const game = createGame('g-1', Visibility.Viewable);
        adminServiceSpy.changeGameVisibility.and.returnValue(of(new HttpResponse<string>({ status: 200, body: 'ok' })));
        gameServiceSpy.deleteGame.and.returnValue(of(new HttpResponse<string>({ status: 200, body: 'ok' })));

        service.fetchGames();
        service.changeGameVisibility('g-1', false).subscribe();
        service.deleteGame(game).subscribe();

        expect(gameTableServiceStub.fetchGames).toHaveBeenCalledWith(false);
        expect(adminServiceSpy.changeGameVisibility).toHaveBeenCalledWith('g-1', false);
        expect(gameServiceSpy.deleteGame).toHaveBeenCalledWith(game);
    });

    it('computes visibility pending/loading states', () => {
        // Nominal case
        const game = createGame('g-1', Visibility.Viewable);

        expect(service.gameIsViewable(game)).toBeTrue();
        expect(service.isVisibilityTogglePending('g-1')).toBeFalse();
        expect(service.isVisibilityToggleLoading(game, true)).toBeFalse();
        expect(service.isVisibilityToggleLoading(game, false)).toBeTrue();
    });

    it('skips visibility toggle when request is already pending', () => {
        // Edge case
        service.pendingVisibilityToggles.set(new Set(['g-1']));
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = false;

        service.toggleVisibility(input, createGame('g-1', Visibility.Viewable));

        expect(adminServiceSpy.changeGameVisibility).not.toHaveBeenCalled();
    });

    it('toggles visibility, refreshes games, and clears pending flag on success', () => {
        // Nominal case
        adminServiceSpy.changeGameVisibility.and.returnValue(of(new HttpResponse<string>({ status: 200, body: 'ok' })));
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = false;

        service.toggleVisibility(input, createGame('g-1', Visibility.Viewable));

        expect(adminServiceSpy.changeGameVisibility).toHaveBeenCalledWith('g-1', false);
        expect(gameTableServiceStub.fetchGames).toHaveBeenCalledWith(false);
        expect(service.isVisibilityTogglePending('g-1')).toBeFalse();
    });

    it('reverts checkbox and shows mapped error message when visibility toggle fails', () => {
        // Edge case
        adminServiceSpy.changeGameVisibility.and.returnValue(
            throwError(() => new HttpErrorResponse({ error: { errorCodes: [ErrorCode.GameNotFound] }, status: 404 })),
        );
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = true;

        service.toggleVisibility(input, createGame('g-2', Visibility.Hidden));

        expect(input.checked).toBeFalse();
        expect(toastServiceSpy.show).toHaveBeenCalledWith('Jeu introuvable');
        expect(service.isVisibilityTogglePending('g-2')).toBeFalse();
    });

    it('deletes game and removes it from table on success', () => {
        // Nominal case
        gameTableServiceStub.tableData = [createGame('g-1'), createGame('g-2')];
        gameServiceSpy.deleteGame.and.returnValue(of(new HttpResponse<string>({ status: 200, body: 'ok' })));

        service.deleteGameAndHandleResult(createGame('g-1'));

        expect(gameTableServiceStub.tableData.map((game) => game._id)).toEqual(['g-2']);
    });

    it('shows fallback error message when deletion fails', () => {
        // Edge case
        gameServiceSpy.deleteGame.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500, error: {} })));

        service.deleteGameAndHandleResult(createGame('g-1'));

        expect(toastServiceSpy.show).toHaveBeenCalledWith('Il y a eu un problème lors de la suppression.');
    });

    it('exposes removeDeletedGameFromTable and showServerMessage helpers', () => {
        // Nominal case
        gameTableServiceStub.tableData = [createGame('a'), createGame('b')];

        service.removeDeletedGameFromTable('a');
        service.showServerMessage(new HttpErrorResponse({ error: {} }), 'Fallback');

        expect(gameTableServiceStub.tableData.map((game) => game._id)).toEqual(['b']);
        expect(toastServiceSpy.show).toHaveBeenCalledWith('Fallback');
    });

    function createGame(id: string, visibility: Visibility = Visibility.Viewable): IExistingGame {
        return {
            _id: id,
            gameTitle: `Game ${id}`,
            description: 'Desc',
            gameMode: GameType.Classic,
            dateCreated: new Date(),
            lastModifiedDate: new Date(),
            visibility,
            board: {
                cells: [[CellType.Empty]],
                items: [],
            },
        };
    }
});
