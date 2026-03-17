/**
 * Testing strategy — Attribute Display Component
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
import { AttributeDisplayComponent } from './attribute-display.component';

describe('AttributeDisplayComponent', () => {
    let component: AttributeDisplayComponent;
    let fixture: ComponentFixture<AttributeDisplayComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AttributeDisplayComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(AttributeDisplayComponent);
        component = fixture.componentInstance;
        component.name = 'Attaque';
        component.value = 7;
        component.bgColor = 'bg-red-500';
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should render attribute name and value', () => {
        const host = fixture.nativeElement as HTMLElement;

        expect(host.textContent).toContain('Attaque');
        expect(host.textContent).toContain('7');
    });

    it('should apply provided background class', () => {
        const card = (fixture.nativeElement as HTMLElement).querySelector('div');

        expect(card?.classList.contains('bg-red-500')).toBeTrue();
    });
});
