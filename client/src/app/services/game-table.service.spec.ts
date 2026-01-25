import { TestBed } from '@angular/core/testing';

import { GameTableServiceService } from './game-table.service';

describe('GameTableServiceService', () => {
    let service: GameTableServiceService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(GameTableServiceService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
