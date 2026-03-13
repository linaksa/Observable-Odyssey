import { TestBed } from '@angular/core/testing';
import { IActiveGame } from '@common/activeGame';
import { Subject } from 'rxjs/internal/Subject';
import { ActiveGameTableService } from './active-game-table.service';
import { GameService } from './game.service';
import SpyObj = jasmine.SpyObj;

describe('ActiveGameTableService', () => {
    let service: ActiveGameTableService;
    let gameServiceSpy: SpyObj<GameService>;

    beforeEach(() => {
        gameServiceSpy = jasmine.createSpyObj('GameService', ['fetchJoinableActiveGames']);

        TestBed.configureTestingModule({
            providers: [ActiveGameTableService, { provide: GameService, useValue: gameServiceSpy }],
        });

        service = TestBed.inject(ActiveGameTableService);
    });

    it('should call GameService.fetchJoinableActiveGames', () => {
        // Nominal fetch case
        // The isLoading flag must be set to true during the fetch, then to false at the end of the fetch

        const subject = new Subject<IActiveGame[]>();
        gameServiceSpy.fetchJoinableActiveGames.and.returnValue(subject.asObservable());

        service.fetchJoinableActiveGames();

        expect(gameServiceSpy.fetchJoinableActiveGames).toHaveBeenCalled();
        expect(service.isLoading()).toBeTrue();

        subject.complete();
        expect(service.isLoading()).toBeFalse();
    });

    it('should update tableData when games are received', () => {
        const subject = new Subject<IActiveGame[]>();
        gameServiceSpy.fetchJoinableActiveGames.and.returnValue(subject.asObservable());

        const games = [{ id: '1' }] as unknown as IActiveGame[];

        service.fetchJoinableActiveGames();
        subject.next(games);

        expect(service.tableData).toEqual(games);
    });

    it('should set tableData to empty array when null is received', () => {
        // Edge case
        // Handle the case where the request fails
        const subject = new Subject<IActiveGame[] | null>();
        gameServiceSpy.fetchJoinableActiveGames.and.returnValue(subject.asObservable() as Subject<IActiveGame[]>);

        service.fetchJoinableActiveGames();
        subject.next(null);

        expect(service.tableData).toEqual([]);
    });
});