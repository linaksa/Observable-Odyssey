import { HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Visibility } from '@common/game';
import { of } from 'rxjs';
import { AdministrationService } from './administration.service';
import { GameService } from './game.service';
import SpyObj = jasmine.SpyObj;

describe('AdministrationService', () => {
    let service: AdministrationService;
    let gameServiceSpy: SpyObj<GameService>;
    const gameId = 'cuvqyg3471fy43819fy43';
    const mockResponse = new HttpResponse<string>({ body: 'ok', status: 200 });

    beforeEach(() => {
        gameServiceSpy = jasmine.createSpyObj('GameService', ['changeGameVisibility']);
        gameServiceSpy.changeGameVisibility.and.returnValue(of(mockResponse));

        TestBed.configureTestingModule({
            providers: [AdministrationService, { provide: GameService, useValue: gameServiceSpy }],
        });

        service = TestBed.inject(AdministrationService);
    });

    it('changeGameVisibility should convert boolean to correct Visibility enum', () => {
        service.changeGameVisibility(gameId, true).subscribe((response) => {
            expect(gameServiceSpy.changeGameVisibility).toHaveBeenCalledWith(gameId, Visibility.Viewable);
            expect(response).toEqual(mockResponse);
        });
    });

    it('changeGameVisibility should convert false to Visibility.Hidden', () => {
        service.changeGameVisibility(gameId, false).subscribe(() => {
            expect(gameServiceSpy.changeGameVisibility).toHaveBeenCalledWith(gameId, Visibility.Hidden);
        });
    });
});
