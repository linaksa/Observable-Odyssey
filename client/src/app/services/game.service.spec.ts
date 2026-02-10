import { TestBed } from '@angular/core/testing';

import { HTTP_CLIENT } from '@app/http/http.interface';
import { GameType, IExistingGame, Visibility } from '@common/game';
import { of, throwError } from 'rxjs';
import { GameService } from './game.service';

describe('GameService', () => {
    let service: GameService;
    const httpSpy = jasmine.createSpyObj('HttpClientPort', ['get', 'post', 'put', 'patch', 'delete']);

    const dummyBaseURL = 'http://localhost:3000/api';

    const gamesMock: IExistingGame = {
        _id: '139841ytfh1cubc34bc43',
        gameTitle: 'Game 1',
        description: '',
        board: { cells: [[]], items: [] },
        gameMode: GameType.Classic,
        lastModifiedDate: new Date(),
        visibility: Visibility.Viewable,
        dateCreated: new Date(),
        preview: '',
    };

    beforeEach(() => {
        httpSpy.get.and.returnValue(of([]));
        httpSpy.post.and.returnValue(of({}));
        httpSpy.put.and.returnValue(of({}));
        httpSpy.patch.and.returnValue(of({}));
        httpSpy.delete.and.returnValue(of({}));

        TestBed.configureTestingModule({
            providers: [{ provide: HTTP_CLIENT, useValue: httpSpy }],
        });

        service = TestBed.inject(GameService);
    });

    it('should call correct end point with function getAllGames', () => {
        httpSpy.get.and.returnValue(of());
        service.getAllGames();

        expect(httpSpy.get).toHaveBeenCalled();
        expect(httpSpy.get).toHaveBeenCalledWith(`${dummyBaseURL}/games`);
    });

    it('should call correct end point with function getGameById', () => {
        httpSpy.get.and.returnValue(of());

        const gameId = '1';
        service.getGameById(gameId);

        expect(httpSpy.get).toHaveBeenCalled();
        expect(httpSpy.get).toHaveBeenCalledWith(`${dummyBaseURL}/games/${gameId}`);
    });

    it('should call correct end point with function changeGameVisibility', () => {
        httpSpy.patch.and.returnValue(of());

        const gameId = '1';
        const visibility = Visibility.Viewable;
        service.changeGameVisibility(gameId, visibility);

        expect(httpSpy.patch).toHaveBeenCalled();
        expect(httpSpy.patch).toHaveBeenCalledWith(`${dummyBaseURL}/games/${gameId}/visibility`, { visibility }, jasmine.any(Object));
    });

    it('should call correct end point with function saveGame', () => {
        httpSpy.put.and.returnValue(of());

        const gameId = '1';
        const gameData = {};
        service.saveGame(gameId, gameData);

        expect(httpSpy.put).toHaveBeenCalled();
        expect(httpSpy.put).toHaveBeenCalledWith(`${dummyBaseURL}/games/${gameId}`, gameData, jasmine.any(Object));
    });

    it('should call correct end point with function createGame', () => {
        httpSpy.post.and.returnValue(of());

        const gameData = {};
        service.createGame(gameData);

        expect(httpSpy.post).toHaveBeenCalled();
        expect(httpSpy.post).toHaveBeenCalledWith(`${dummyBaseURL}/games`, { game: gameData }, jasmine.any(Object));
    });

    it('should call correct end point with function deleteGame', () => {
        httpSpy.delete.and.returnValue(of());

        service.deleteGame(gamesMock);

        expect(httpSpy.delete).toHaveBeenCalled();
        expect(httpSpy.delete).toHaveBeenCalledWith(`${dummyBaseURL}/games/${gamesMock._id}`, jasmine.any(Object));
    });

    it('should not crash when the request fails', () => {
        httpSpy.get.and.returnValue(
            throwError(() => new Error('404')),
        );
        
        service.getAllGames();
    });
});
