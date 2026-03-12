/**
 * Testing strategy — ToastService
 *
 * Approach: minimal creation test using Angular TestBed.
 * Verifies the service is correctly instantiated by the Angular injector
 * without additional dependencies to configure.
 */
import { TestBed } from '@angular/core/testing';

import { ToastService } from './toast.service';

describe('ToastService', () => {
    let service: ToastService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ToastService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
