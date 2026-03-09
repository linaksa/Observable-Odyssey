/**
 * Stratégie de test – GameTableService
 *
 * Approche : tests unitaires Angular avec GameService substitué par un spy Jasmine.
 * Les données de test contiennent intentionnellement un jeu visible et un jeu
 * caché pour permettre de tester le filtrage par visibilité.
 *
 * Cas limites couverts :
 * - Réponse vide (tableau vide) : fetchGames() avec ou sans filtre de visibilité
 *   doit renvoyer un tableData vide sans erreur.
 * - Réponse null : le serveur peut théoriquement renvoyer null en cas d'anomalie ;
 *   fetchGames() doit normaliser cette valeur en tableau vide pour protéger les
 *   consommateurs du tableData.
 * - Filtre visibilité désactivé (false) : tous les jeux, y compris les cachés,
 *   doivent apparaître dans tableData.
 * - Filtre visibilité activé (true) : seuls les jeux avec Visibility.Viewable
 *   doivent être conservés.
 */
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import SpyObj = jasmine.SpyObj;

import { HTTP_CLIENT } from '@app/http/http-interface';
import { GameType, IExistingGame, Visibility } from '@common/game';
import { GameTableService } from './game-table.service';
import { GameService } from './game.service';

describe('GameTableService', () => {
    let service: GameTableService;
    let gameServiceSpy: SpyObj<GameService>;

    const gamesMock: IExistingGame[] = [
        {
            _id: '1uqgifiirvpoh4gnrbriovhn',
            gameTitle: 'Visible Game',
            description: '',
            board: { cells: [[]], items: [] },
            gameMode: GameType.Classic,
            lastModifiedDate: new Date(),
            visibility: Visibility.Viewable,
            dateCreated: new Date(),
            preview: '',
        },
        {
            _id: '102974rj32ofqeqhjbfeqi',
            gameTitle: 'Hidden Game',
            description: '',
            board: { cells: [[]], items: [] },
            gameMode: GameType.Ctf,
            lastModifiedDate: new Date(),
            visibility: Visibility.Hidden,
            dateCreated: new Date(),
            preview: '',
        },
    ];

    beforeEach(() => {
        const httpSpy = jasmine.createSpyObj('HttpClientPort', ['get', 'post', 'put', 'patch', 'delete']);
        httpSpy.get.and.returnValue(of([]));
        httpSpy.post.and.returnValue(of({}));
        httpSpy.put.and.returnValue(of({}));
        httpSpy.patch.and.returnValue(of({}));
        httpSpy.delete.and.returnValue(of({}));
        TestBed.configureTestingModule({
            providers: [{ provide: HTTP_CLIENT, useValue: httpSpy }],
        });
        service = TestBed.inject(GameTableService);

        gameServiceSpy = jasmine.createSpyObj('GameService', ['getAllGames']);
        service.gameService = gameServiceSpy;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should have tableData initialized as empty', () => {
        expect(service.tableData).toEqual([]);
    });

    it('should fetch all games', () => {
        gameServiceSpy.getAllGames.and.returnValue(of(gamesMock));

        service.fetchGames();

        expect(gameServiceSpy.getAllGames).toHaveBeenCalled();
        expect(service.tableData).toEqual(gamesMock);
    });

    it('should fetch only visible games', () => {
        gameServiceSpy.getAllGames.and.returnValue(of(gamesMock));

        service.fetchGames(true);

        expect(gameServiceSpy.getAllGames).toHaveBeenCalled();
        expect(service.tableData).toEqual([gamesMock[0]]);
    });

    // Cas limite : le serveur renvoie un tableau vide, avec et sans filtre de visibilité.
    // tableData doit rester [] dans les deux cas sans erreur.
    it('should handle empty response', () => {
        gameServiceSpy.getAllGames.and.returnValue(of([]));

        service.fetchGames();
        expect(service.tableData).toEqual([]);

        service.fetchGames(true);
        expect(service.tableData).toEqual([]);
    });

    // Cas limite : le serveur renvoie null au lieu d'un tableau (anomalie serveur ou
    // réseau). fetchGames() doit normaliser cette valeur en tableau vide pour éviter
    // que les consommateurs de tableData reçoivent null et plantent.
    it('should handle null response', () => {
        gameServiceSpy.getAllGames.and.returnValue(of(null as unknown as IExistingGame[]));

        service.fetchGames();
        expect(service.tableData).toEqual([]);

        service.fetchGames(true);
        expect(service.tableData).toEqual([]);
    });
});
