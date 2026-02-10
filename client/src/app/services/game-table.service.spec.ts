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

        service.fetchVisibleGames();

        expect(gameServiceSpy.getAllGames).toHaveBeenCalled();
        expect(service.tableData).toEqual([gamesMock[0]]);
    });

    it('should handle empty response', () => {
        gameServiceSpy.getAllGames.and.returnValue(of([]));

        service.fetchGames();
        expect(service.tableData).toEqual([]);

        service.fetchVisibleGames();
        expect(service.tableData).toEqual([]);
    });

    it('should handle null response', () => {
        gameServiceSpy.getAllGames.and.returnValue(of(null as unknown as IExistingGame[]));

        service.fetchGames();
        expect(service.tableData).toEqual([]);

        service.fetchVisibleGames();
        expect(service.tableData).toEqual([]);
    });
});
