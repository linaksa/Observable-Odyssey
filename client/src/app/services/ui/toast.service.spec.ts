/**
 * Testing strategy — ToastService
 *
 * Approach: minimal creation test using Angular TestBed.
 * Verifies the service is correctly instantiated by the Angular injector
 * without additional dependencies to configure.
 */
import { TestBed } from '@angular/core/testing';

import { DEFAULT_TOAST_DURATION_MS } from '@app/constants/utils';
import { ToastService } from './toast.service';

describe('ToastService', () => {
    let service: ToastService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ToastService);
    });

    // Edge case: should use default duration when show is called without duration.
    it('should use default duration when show is called without duration', () => {
        // Nominal case
        // Validate that the method without parameters uses the default parameters

        spyOn(service, 'showWithDuration');

        const message = 'Test message';
        service.show(message);

        expect(service.showWithDuration).toHaveBeenCalledWith(message, DEFAULT_TOAST_DURATION_MS);
    });

    it('should set message and show toast when showWithDuration is called', () => {
        const message = 'Test message';
        const duration = 5000;
        service.showWithDuration(message, duration);

        expect(service.toastMessage()).toBe(message);
        expect(service.showToast()).toBeTrue();
    });

    it('should hide toast when hide is called', () => {
        // Nominal case
        // Validate that the hide() method hides the toast

        service.showToast.set(true); // Simulate that the toast is displayed
        service.hide();
        expect(service.showToast()).toBeFalse();
    });

    it('should hide toast after duration expires', (done) => {
        // Nominal case
        // Validate that the toast automatically hides after the specified duration

        const message = 'Test message';
        const duration = 100; // Short duration for the test
        service.showWithDuration(message, duration);

        setTimeout(() => {
            expect(service.showToast()).toBeFalse();
            done();
        }, 2 * duration); // Wait slightly longer than the duration to ensure the timeout is executed
    });

    it('should clear previous timeout when showWithDuration is called multiple times', (done) => {
        // Nominal case
        // Validate that successive calls to showWithDuration reset the timeout

        spyOn(window, 'clearTimeout').and.callThrough();

        const message = 'Test message';
        const timeout = 200;
        service.showWithDuration(message, timeout);

        setTimeout(() => {
            service.showWithDuration(message, timeout);
            expect(window.clearTimeout).toHaveBeenCalled();
            done();
        }, timeout / 2);
    });
});
