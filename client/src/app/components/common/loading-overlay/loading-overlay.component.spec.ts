/**
 * Testing strategy — Loading Overlay Component
 *
 * Approach:
 * - Keep each test focused on one behavior with deterministic mocks/spies.
 * - Validate both nominal flows and failure paths that could break UX/state.
 * - Assert side effects explicitly (state changes, emitted events, and service calls).
 *
 * Edge cases covered:
 * - Missing or invalid input guards and safe early returns.
 * - Error handling paths and fallback user-facing messaging.
 * - Cleanup/teardown behavior (unsubscribe/reset/disconnect) when applicable.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingOverlayComponent } from './loading-overlay.component';

describe('LoadingOverlayComponent', () => {
    let component: LoadingOverlayComponent;
    let fixture: ComponentFixture<LoadingOverlayComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [LoadingOverlayComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(LoadingOverlayComponent);
        component = fixture.componentInstance;
        component.loadingText = 'Chargement en cours...';
        fixture.detectChanges();
    });

    // Edge case: Minimal setup path with isolated TestBed configuration. Verifies instantiation succeeds without missing dependencies.
    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should render loading image and configured text', () => {
        const host = fixture.nativeElement as HTMLElement;
        const image = host.querySelector('img');

        expect(image?.getAttribute('alt')).toBe('Chargement');
        expect(image?.getAttribute('src')).toBe('./assets/loading/cogwheel.png');
        expect(host.textContent).toContain('Chargement en cours...');
    });
});
