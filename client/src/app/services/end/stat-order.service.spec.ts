import { TestBed } from '@angular/core/testing';

import { StatOrderService } from './stat-order.service';

describe('StatOrderService', () => {
    let service: StatOrderService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(StatOrderService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
