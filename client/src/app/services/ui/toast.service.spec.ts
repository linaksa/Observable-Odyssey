/**
 * Testing strategy — ToastService
 *
 * Approach:
 * - Use fake timers to validate `show` duration handling and automatic hide behavior.
 * - Assert manual hide and timeout replacement semantics through the public signal state.
 *
 * Edge cases covered:
 * - A second toast cancels the previous timer to prevent stale hides.
 * - Default-duration calls still hide automatically when no explicit delay is provided.
 */
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { DEFAULT_TOAST_DURATION_MS } from '@app/constants/utils';
import { ToastService } from '@app/services/ui/toast.service';

const ONE_SECOND_MS = 1000;

describe('ToastService', () => {
    let service: ToastService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [ToastService],
        });
        service = TestBed.inject(ToastService);
    });

    it('shows a toast then hides it after the provided duration', fakeAsync(() => {
        // Nominal case
        service.showWithDuration('Saved', ONE_SECOND_MS);

        expect(service.showToast()).toBeTrue();
        expect(service.toastMessage()).toBe('Saved');

        tick(ONE_SECOND_MS);

        expect(service.showToast()).toBeFalse();
    }));

    it('uses the default duration in show()', fakeAsync(() => {
        // Nominal case
        service.show('Default duration toast');

        tick(DEFAULT_TOAST_DURATION_MS - 1);
        expect(service.showToast()).toBeTrue();

        tick(1);
        expect(service.showToast()).toBeFalse();
    }));

    it('clears the previous timeout when showing another toast', fakeAsync(() => {
        // Edge case
        const clearTimeoutSpy = spyOn(window, 'clearTimeout').and.callThrough();

        service.showWithDuration('First', ONE_SECOND_MS);
        const firstTimeoutId = service.toastTimeoutId;
        service.showWithDuration('Second', ONE_SECOND_MS);

        expect(clearTimeoutSpy).toHaveBeenCalledWith(firstTimeoutId as ReturnType<typeof setTimeout>);
        expect(service.toastMessage()).toBe('Second');
    }));

    it('hides toast immediately when hide() is called', fakeAsync(() => {
        // Edge case
        service.showWithDuration('Visible', ONE_SECOND_MS);
        service.hide();

        expect(service.showToast()).toBeFalse();
    }));
});
