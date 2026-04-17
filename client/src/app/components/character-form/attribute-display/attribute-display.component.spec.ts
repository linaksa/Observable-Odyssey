/**
 * Testing strategy — Attribute Display Component
 *
 * Approach:
 * - Initialize the component with representative input values for label, number, and color class.
 * - Verify rendered text reflects the provided attribute name/value pair.
 * - Check host styling by asserting the dynamic Tailwind background class binding.
 *
 * Edge cases covered:
 * - Ensures numeric values are rendered as text without custom formatting regressions.
 * - Guards against dropped CSS binding by checking the exact configured class.
 * - Confirms standalone creation with only direct @Input wiring.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttributeDisplayComponent } from '@app/components/character-form/attribute-display/attribute-display.component';

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

    // Edge case: Minimal setup path with isolated TestBed configuration. Verifies instantiation succeeds without missing dependencies.
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
