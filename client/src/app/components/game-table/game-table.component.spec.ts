import { HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminSocketService } from '@app/services/admin.socket.service';
import { AdministrationService } from '@app/services/administrationService';
import { GameTableService } from '@app/services/game-table.service';
import { GameService } from '@app/services/game.service';
import { GameType, IExistingGame, Visibility } from '@common/game';
import { of, Subject, throwError } from 'rxjs';
import { GameTableComponent } from './game-table.component';
import SpyObj = jasmine.SpyObj;

describe('GameTableComponent', () => {
    let component: GameTableComponent;
    let fixture: ComponentFixture<GameTableComponent>;
    let gameTableServiceSpy: SpyObj<GameTableService>;
    let adminSocketServiceSpy: SpyObj<AdminSocketService>;
    let adminServiceSpy: SpyObj<AdministrationService>;
    let gameServiceSpy: SpyObj<GameService>;
    let signalSubject: Subject<void>;
    const gamesMock: IExistingGame[] = [
        {
            _id: '139841ytfh1cubc34bc43',
            gameTitle: 'Game 1',
            description: '',
            board: { cells: [[]], items: [] },
            gameMode: GameType.Classic,
            lastModifiedDate: new Date(),
            visibility: Visibility.Viewable,
            dateCreated: new Date(),
            preview: '',
        },
    ];

    beforeEach(async () => {
        gameTableServiceSpy = jasmine.createSpyObj('GameTableService', ['fetchGames', 'fetchVisibleGames'], { tableData: [] });
        adminSocketServiceSpy = jasmine.createSpyObj('AdminSocketService', ['fetchGamesOnSignal', 'connect', 'disconnect']);
        adminServiceSpy = jasmine.createSpyObj('AdministrationService', ['changeGameVisibility']);
        gameServiceSpy = jasmine.createSpyObj('GameService', ['deleteGame']);

        // mock le signal avec un Subject pour pouvoir émettre
        signalSubject = new Subject<void>();
        adminSocketServiceSpy.fetchGamesOnSignal.and.returnValue(signalSubject.asObservable());

        await TestBed.configureTestingModule({
            imports: [],
            providers: [
                { provide: GameTableService, useValue: gameTableServiceSpy },
                { provide: AdminSocketService, useValue: adminSocketServiceSpy },
                { provide: AdministrationService, useValue: adminServiceSpy },
                { provide: GameService, useValue: gameServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameTableComponent);
        component = fixture.componentInstance;
    });

    it('should fetch all games if isAdmin is true', () => {
        // good
        component.isAdmin = true;
        component.fetchCorrectGames();
        expect(gameTableServiceSpy.fetchGames).toHaveBeenCalled();
        expect(gameTableServiceSpy.fetchVisibleGames).not.toHaveBeenCalled();
    });

    it('should fetch visible games if isAdmin is false', () => {
        // good
        component.isAdmin = false;
        component.fetchCorrectGames();
        expect(gameTableServiceSpy.fetchVisibleGames).toHaveBeenCalled();
        expect(gameTableServiceSpy.fetchGames).not.toHaveBeenCalled();
    });

    it('gameIsViewable should return true only for Visibility.Viewable', () => {
        // good
        const viewableGame = { ...gamesMock[0], visibility: Visibility.Viewable };
        const hiddenGame = { ...gamesMock[0], visibility: Visibility.Hidden };
        expect(component.gameIsViewable(viewableGame)).toBeTrue();
        expect(component.gameIsViewable(hiddenGame)).toBeFalse();
    });
    // good
    it('toggleVisibility success should call fetchGames and re-enable input', () => {
        const input = { checked: true, disabled: false } as HTMLInputElement;
        adminServiceSpy.changeGameVisibility.and.returnValue(of(new HttpResponse<string>({ body: 'ok', status: 200 })));

        component.toggleVisibility({ target: input } as unknown as Event, gamesMock[0]);

        expect(input.disabled).toBeFalse();
        expect(adminServiceSpy.changeGameVisibility).toHaveBeenCalledWith(gamesMock[0]._id, input.checked);
        expect(gameTableServiceSpy.fetchGames).toHaveBeenCalled();
    });
    // good
    it('toggleVisibility error should revert checked and re-enable input', () => {
        const input = { checked: true, disabled: false } as HTMLInputElement;
        adminServiceSpy.changeGameVisibility.and.returnValue(throwError(() => new Error('error')));

        component.toggleVisibility({ target: input } as unknown as Event, gamesMock[0]);

        expect(input.disabled).toBeFalse();
        expect(input.checked).toBeFalse();
    });

    it('deleteGame success should remove game from tableData', () => {
        gameTableServiceSpy.tableData = [...gamesMock];
        gameServiceSpy.deleteGame.and.returnValue(of(new HttpResponse<string>({ body: 'ok', status: 200 })));

        component.deleteGame(gamesMock[0]);
        expect(gameTableServiceSpy.tableData.length).toBe(0);
    });

    it('deleteGame error should open snackbar with custom message', () => {
        gameServiceSpy.deleteGame.and.returnValue(throwError(() => ({ error: { error: 'delete failed' } })));

        component.deleteGame(gamesMock[0]);
        expect(component.toastMessage()).toBe('delete failed');
    });

    it('deleteGame error should open snackbar with default message when no custom error', () => {
        gameServiceSpy.deleteGame.and.returnValue(throwError(() => ({ error: {} })));

        component.deleteGame(gamesMock[0]);
        expect(component.toastMessage()).toBe('Il y a eu un problème lors de la suppression.');
    });

    it('ngOnDestroy should call disconnect on adminSocketService', () => {
        component.ngOnDestroy();
        expect(adminSocketServiceSpy.disconnect).toHaveBeenCalled();
    });

    it('ngOnInit should clear tableData and fetch correct games', () => {
        gameTableServiceSpy.tableData = gamesMock;
        component.isAdmin = true;
        component.ngOnInit();
        expect(gameTableServiceSpy.tableData).toEqual([]);
        expect(gameTableServiceSpy.fetchGames).toHaveBeenCalled();
    });

    it('ngOnInit should subscribe to socket signal and fetch games on next', () => {
        component.isAdmin = true;
        component.ngOnInit();
        signalSubject.next();
        expect(gameTableServiceSpy.fetchGames).toHaveBeenCalledTimes(2);
    });

    it('ngOnInit should handle socket signal error and open snackbar with custom message', () => {
        component.ngOnInit();
        const customError = { error: { error: 'Erreur personnalisée du serveur' } };
        signalSubject.error(customError);
        expect(component.toastMessage()).toBe('Erreur personnalisée du serveur');
    });

    it('ngOnInit should handle socket signal error with default message', () => {
        component.ngOnInit();
        const error = { error: {} };
        signalSubject.error(error);
        expect(component.toastMessage()).toBe("Il y a eu un problème lors de l'ajout des jeux.");
    });
});
