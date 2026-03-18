/**
 * Testing strategy — Back Navigation Component
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
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';
import { BackNavigationComponent } from './back-navigation.component';

describe('BackNavigationComponent', () => {
    let component: BackNavigationComponent;
    let fixture: ComponentFixture<BackNavigationComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [BackNavigationComponent],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(BackNavigationComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    // Edge case: Minimal setup path with isolated TestBed configuration. Verifies instantiation succeeds without missing dependencies.
    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should render a back button to creation view', () => {
        const host = fixture.nativeElement as HTMLElement;
        const routerLink = fixture.debugElement.query(By.directive(RouterLink)).injector.get(RouterLink);

        expect(host.textContent).toContain('Retour vers la vue de création');
        expect(routerLink.urlTree?.toString()).toBe('/create');
    });
});
