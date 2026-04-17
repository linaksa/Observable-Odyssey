/**
 * Testing strategy — Toast Component
 *
 * Approach:
 * - Instantiate the standalone component with a real ToastService.
 *
 * Edge cases covered:
 * - Ensure injected service wiring is preserved on component instance.
 * - Verify that component renders toast message when service showToast signal is true.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastComponent } from '@app/components/common/toast/toast.component';
import { ToastService } from '@app/services/ui/toast.service';

describe('ToastComponent', () => {
    let fixture: ComponentFixture<ToastComponent>;
    let component: ToastComponent;
    let toastService: ToastService;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ToastComponent],
        }).compileComponents();

        toastService = TestBed.inject(ToastService);
        fixture = TestBed.createComponent(ToastComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    // Nominal case: service is properly injected.
    it('injects the toast service into the component', () => {
        expect(component['toastService']).toBe(toastService);
    });

    // Edge case: toast renders when showToast signal is true.
    it('renders toast message when showToast is true', () => {
        toastService.toastMessage.set('Test Message');
        toastService.showToast.set(true);
        fixture.detectChanges();

        const toastElement = fixture.nativeElement.querySelector('[role="status"]');
        expect(toastElement).toBeTruthy();
        expect(toastElement.textContent).toContain('Test Message');
    });

    // Edge case: toast is hidden when showToast signal is false.
    it('hides toast when showToast is false', () => {
        toastService.showToast.set(false);
        fixture.detectChanges();

        const toastElement = fixture.nativeElement.querySelector('[role="status"]');
        expect(toastElement).toBeFalsy();
    });
});
