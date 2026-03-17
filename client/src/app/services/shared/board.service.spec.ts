/**
 * Stratégie de test – BoardSharedService (client)
 *
 * Approche : test de création minimal avec Angular TestBed.
 * Vérifie que le service partagé de plateau est instancié correctement par
 * l'injecteur Angular sans dépendances supplémentaires.
 */
import { TestBed } from '@angular/core/testing';

import { BoardSharedService } from './boardShared.service';

describe('BoardSharedService', () => {
    let service: BoardSharedService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(BoardSharedService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
