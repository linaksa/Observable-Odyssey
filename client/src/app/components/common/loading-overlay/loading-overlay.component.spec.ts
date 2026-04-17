/**
 * Testing strategy — Loading Overlay Component
 *
 * Approach:
 * - Instantiate the standalone overlay with a custom loading text input.
 * - Assert both visual asset metadata and displayed status text from the template.
 * - Keep checks focused on rendered DOM output for user-visible loading feedback.
 *
 * Edge cases covered:
 * - Verifies the image alt text remains accessible and localized.
 * - Confirms the component points to the expected cogwheel loading asset path.
 * - Ensures custom loadingText input is rendered without additional setup.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingOverlayComponent } from '@app/components/common/loading-overlay/loading-overlay.component';

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
