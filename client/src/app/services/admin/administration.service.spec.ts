/**
 * Testing strategy — AdministrationService
 *
 * Approach:
 * - Mock `GameService` and call `changeGameVisibility` through the public API.
 * - Assert boolean input conversion to shared `Visibility` enum values before delegation.
 *
 * Edge cases covered:
 * - `true` maps to `Visibility.Viewable`.
 * - `false` maps to `Visibility.Hidden`, preventing accidental inversion.
 */
import { HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Visibility } from '@common/game';
import { of } from 'rxjs';
import { AdministrationService } from '@app/services/admin/administration.service';
import { GameService } from '@app/services/admin/game.service';
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

    // Edge case: passing false, the less intuitive value, to ensure
    // there is no accidental inversion (true → Hidden, false → Viewable).
    it('changeGameVisibility should convert false to Visibility.Hidden', () => {
        service.changeGameVisibility(gameId, false).subscribe(() => {
            expect(gameServiceSpy.changeGameVisibility).toHaveBeenCalledWith(gameId, Visibility.Hidden);
        });
    });
});
