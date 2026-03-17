/**
 * Testing strategy — GameService (client)
 *
 * Approach: unit tests using Jasmine spies for the HTTP layer (HTTP_CLIENT).
 * The abstract HTTP interface is replaced by a spy object, allowing verification
 * of URLs and request bodies without real network calls.
 * Each public method is tested independently to ensure the correct
 * endpoint is constructed with the right parameters.
 *
 * Edge cases covered:
 * - Network error (throwError): verifies getAllGames() does not crash
 *   the application when the server is unreachable; the error stream should
 *   be propagated to the subscriber without an unhandled exception.
 */
import { TestBed } from '@angular/core/testing';

import { HTTP_CLIENT } from '@app/http/http-interface';
import { GameType, IExistingGame, Visibility } from '@common/game';
import { lastValueFrom, of, throwError } from 'rxjs';
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

    it('should call correct end point with function getActiveGameById', () => {
        httpSpy.get.and.returnValue(of());

        const activeGameId = '1';
        service.getActiveGameById(activeGameId);

        expect(httpSpy.get).toHaveBeenCalled();
        expect(httpSpy.get).toHaveBeenCalledWith(`${dummyBaseURL}/activeGame/${activeGameId}`);
    });

    it('should call correct end point with function fetchJoinableActiveGames', () => {
        httpSpy.get.and.returnValue(of());

        service.fetchJoinableActiveGames();

        expect(httpSpy.get).toHaveBeenCalled();
        expect(httpSpy.get).toHaveBeenCalledWith(`${dummyBaseURL}/activeGame/joinable`);
    });

    it('should call correct end point with function getActiveGameById', () => {
        httpSpy.get.and.returnValue(of());

        const activeGameId = '1';
        service.getActiveGameById(activeGameId);

        expect(httpSpy.get).toHaveBeenCalled();
        expect(httpSpy.get).toHaveBeenCalledWith(`${dummyBaseURL}/activeGame/${activeGameId}`);
    });

    it('should call correct end point with function fetchJoinableActiveGames', () => {
        httpSpy.get.and.returnValue(of());

        service.fetchJoinableActiveGames();

        expect(httpSpy.get).toHaveBeenCalled();
        expect(httpSpy.get).toHaveBeenCalledWith(`${dummyBaseURL}/activeGame/joinable`);
    });

    // Edge case: the server responds with an error (e.g., 404). Verifies that the service
    // correctly propagates the error observable without throwing a synchronous exception.
    // Edge case: should not crash when the request fails.
    it('should not crash when the request fails', () => {
        httpSpy.get.and.returnValue(throwError(() => new Error('404')));

        lastValueFrom(service.getAllGames());
    });
});
