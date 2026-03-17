/**
 * Testing strategy — BoardSharedService (client)
 *
 * Approach: minimal instantiation test using Angular TestBed.
 * Verifies the shared board service is correctly instantiated by
 * the Angular injector without additional dependencies.
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
