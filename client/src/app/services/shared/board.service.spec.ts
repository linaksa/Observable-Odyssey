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
