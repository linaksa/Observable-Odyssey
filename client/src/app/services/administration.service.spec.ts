/**
 * Stratégie de test – AdministrationService
 *
 * Approche : tests unitaires Angular avec GameService substitué par un spy Jasmine.
 * Les deux valeurs booléennes possibles (true/false) sont testées séparément pour
 * vérifier la conversion booléen → énumération Visibility.
 *
 * Cas limites couverts :
 * - Passage de true : doit correspondre à Visibility.Viewable (statut public).
 * - Passage de false : doit correspondre à Visibility.Hidden (statut privé).
 *   Ces deux cas sont les seuls états possibles ; les tester tous les deux garantit
 *   l'absence d'inversion accidentelle de la logique de conversion.
 */
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

    // Cas limite : passage de false, la valeur la moins intuitive, pour vérifier
    // qu'il n'y a pas d'inversion accidentelle (true → Hidden, false → Viewable).
    it('changeGameVisibility should convert false to Visibility.Hidden', () => {
        service.changeGameVisibility(gameId, false).subscribe(() => {
            expect(gameServiceSpy.changeGameVisibility).toHaveBeenCalledWith(gameId, Visibility.Hidden);
        });
    });
});
