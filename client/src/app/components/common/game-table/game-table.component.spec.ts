import { HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminSocketService } from '@app/services/admin.socket.service';
import { AdministrationService } from '@app/services/administration.service';
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
        {
            _id: '3832746273854782343u4huiygfrqyrf',
            gameTitle: 'Game 2',
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
        gameTableServiceSpy = jasmine.createSpyObj('GameTableService', ['fetchGames', 'fetchVisibleGames', 'isLoading'], { tableData: [] });
        adminSocketServiceSpy = jasmine.createSpyObj('AdminSocketService', ['onGamesModified', 'connect', 'disconnect']);
        adminServiceSpy = jasmine.createSpyObj('AdministrationService', ['changeGameVisibility']);
        gameServiceSpy = jasmine.createSpyObj('GameService', ['deleteGame']);

        // mock le signal avec un Subject pour pouvoir émettre
        signalSubject = new Subject<void>();
        adminSocketServiceSpy.onGamesModified.and.returnValue(signalSubject.asObservable());

        await TestBed.configureTestingModule({
            imports: [],
            providers: [
                { provide: GameTableService, useValue: gameTableServiceSpy },
                { provide: AdminSocketService, useValue: adminSocketServiceSpy },
                { provide: AdministrationService, useValue: adminServiceSpy },
                { provide: GameService, useValue: gameServiceSpy },
            ],
        }).compileComponents();

        Object.defineProperty(gameTableServiceSpy, 'tableData', {
            writable: true,
            value: [],
        });

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
        expect(gameTableServiceSpy.tableData.length).toBe(1);
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
});
