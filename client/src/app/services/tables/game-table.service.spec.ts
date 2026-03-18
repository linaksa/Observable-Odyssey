/**
 * Testing strategy — GameTableService
 *
 * Approach: Angular unit tests with GameService replaced by a Jasmine spy.
 * The test data intentionally contains a visible game and a hidden game
 * to allow testing of visibility filtering.
 *
 * Edge cases covered:
 * - Empty response (empty array): fetchGames() with or without visibility filter
 *   should return an empty tableData without error.
 * - Null response: the server may theoretically return null in case of anomaly;
 *   fetchGames() should normalize this value to an empty array to protect
 *   tableData consumers.
 * - Visibility filter disabled (false): all games, including hidden ones,
 *   should appear in tableData.
 * - Visibility filter enabled (true): only games with Visibility.Viewable
 *   should be retained.
 */
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import SpyObj = jasmine.SpyObj;

import { GameType, IExistingGame, Visibility } from '@common/game';
import { GameTableService } from './game-table.service';
import { GameService } from '@app/services/admin/game.service';

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
        gameServiceSpy = jasmine.createSpyObj('GameService', ['getAllGames']);

        TestBed.configureTestingModule({
            providers: [GameTableService, { provide: GameService, useValue: gameServiceSpy }],
        });

        service = TestBed.inject(GameTableService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    // Edge case: When required input data is missing, have tableData initialized as empty.
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

    it('should clear loading state when fetch errors', () => {
        const subject = new Subject<IExistingGame[]>();
        gameServiceSpy.getAllGames.and.returnValue(subject.asObservable());

        service.fetchGames();
        subject.error(new Error('network error'));

        expect(service.isLoading()).toBeFalse();
        expect((service as unknown as { gameServiceSubscription?: unknown }).gameServiceSubscription).toBeUndefined();
    });

    // Edge case: the server returns an empty array, with or without a visibility filter.
    // tableData should remain [] in both cases without error.
    // Edge case: When required input data is missing, handle empty response.
    it('should handle empty response', () => {
        gameServiceSpy.getAllGames.and.returnValue(of([]));

        service.fetchGames();
        expect(service.tableData).toEqual([]);

        service.fetchGames(true);
        expect(service.tableData).toEqual([]);
    });

    // Edge case: the server returns null instead of an array (server or
    // network anomaly). fetchGames() should normalize this value to an empty array to prevent
    // tableData consumers from receiving null and crashing.
    // Edge case: When required input data is missing, handle null response.
    it('should handle null response', () => {
        gameServiceSpy.getAllGames.and.returnValue(of(null as unknown as IExistingGame[]));

        service.fetchGames();
        expect(service.tableData).toEqual([]);

        service.fetchGames(true);
        expect(service.tableData).toEqual([]);
    });

    it('should unsubscribe on destroy', () => {
        const unsubscribeSpy = jasmine.createSpy('unsubscribe');
        Object.assign(service as unknown as Record<string, unknown>, {
            gameServiceSubscription: { unsubscribe: unsubscribeSpy },
        });

        service.onDestroy();

        expect(unsubscribeSpy).toHaveBeenCalled();
    });
});
