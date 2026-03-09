/**
 * Stratégie de test – GameTableComponent
 *
 * Approche : tests unitaires de composant Angular avec spies Jasmine.
 * Toutes les dépendances (GameTableService, AdminSocketService, AdministrationService,
 * GameService) sont substituées par des spies pour isoler la logique du composant.
 * Un Subject RxJS simule le flux d'événements socket (onGamesModified) afin de
 * tester la réactivité du composant aux mises à jour en temps réel.
 *
 * Cas limites couverts :
 * - toggleVisibility avec erreur HTTP : le checkbox doit être remis à son état
 *   précédent (checked inversé) et réactivé pour éviter un état incohérent de l'UI.
 * - ngOnInit avec socket signal : vérifie que chaque émission du Subject déclenche
 *   un rechargement des jeux, validant la réactivité aux événements WebSocket.
 * - deleteGame avec succès : le jeu supprimé doit être retiré du tableData local
 *   sans rechargement complet de la liste.
 * - ngOnDestroy : le service socket doit être déconnecté pour libérer les ressources.
 */
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
        gameTableServiceSpy = jasmine.createSpyObj('GameTableService', ['fetchGames', 'isLoading'], { tableData: [] });
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (component as any).fetchCorrectGames();
        expect(gameTableServiceSpy.fetchGames).toHaveBeenCalledWith(false);
    });

    it('should fetch visible games if isAdmin is false', () => {
        // good
        component.isAdmin = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (component as any).fetchCorrectGames();
        expect(gameTableServiceSpy.fetchGames).toHaveBeenCalledWith(true);
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
    // Cas limite : l'appel HTTP changeGameVisibility échoue (ex: timeout réseau).
    // Le checkbox doit être remis dans son état précédent (checked inversé) et
    // réactivé pour éviter un état UI incohérent (input bloqué indéfiniment).
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
