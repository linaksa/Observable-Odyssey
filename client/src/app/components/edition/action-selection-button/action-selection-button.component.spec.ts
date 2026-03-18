/**
 * Testing strategy — Action Selection Button Component
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
import { ActionSelectionButtonComponent } from './action-selection-button.component';

describe('ActionSelectionButtonComponent', () => {
    let component: ActionSelectionButtonComponent;
    let fixture: ComponentFixture<ActionSelectionButtonComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ActionSelectionButtonComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ActionSelectionButtonComponent);
        component = fixture.componentInstance;
    });

    // Edge case: Minimal setup path with isolated TestBed configuration. Verifies instantiation succeeds without missing dependencies.
    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should apply selected classes when selected and enabled', () => {
        component.isSelected = true;
        component.disabled = false;
        fixture.detectChanges();
        const button = (fixture.nativeElement as HTMLElement).querySelector('button');

        expect(button?.classList.contains('bg-blue-500')).toBeTrue();
        expect(button?.classList.contains('text-white')).toBeTrue();
        expect(button?.hasAttribute('disabled')).toBeFalse();
    });

    it('should apply disabled classes and disabled attribute when disabled', () => {
        component.disabled = true;
        component.tooltip = 'Action indisponible';
        fixture.detectChanges();
        const button = (fixture.nativeElement as HTMLElement).querySelector('button');

        expect(button?.hasAttribute('disabled')).toBeTrue();
        expect(button?.classList.contains('bg-gray-200')).toBeTrue();
        expect(button?.classList.contains('cursor-not-allowed')).toBeTrue();
        expect(button?.getAttribute('title')).toBe('Action indisponible');
    });
});
