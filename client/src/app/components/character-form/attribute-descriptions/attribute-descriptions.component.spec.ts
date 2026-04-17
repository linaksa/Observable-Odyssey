/**
 * Testing strategy — Attribute Descriptions Component
 *
 * Approach:
 * - Mount the standalone component directly and validate the rendered static content.
 * - Assert the French section title and the ordered list entries that describe each attribute.
 * - Keep expectations DOM-focused to protect user-facing copy and list structure.
 *
 * Edge cases covered:
 * - Enforces exactly four description items to catch missing or duplicated entries.
 * - Verifies each expected label (Vie, Rapidité, Attaque, Défense) is present in order.
 * - Confirms the component can initialize with no external inputs or providers.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttributeDescriptionsComponent } from '@app/components/character-form/attribute-descriptions/attribute-descriptions.component';

const ATTRIBUTE_DESCRIPTION_COUNT = 4;

describe('AttributeDescriptionsComponent', () => {
    let component: AttributeDescriptionsComponent;
    let fixture: ComponentFixture<AttributeDescriptionsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AttributeDescriptionsComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(AttributeDescriptionsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    // Edge case: Minimal setup path with isolated TestBed configuration. Verifies instantiation succeeds without missing dependencies.
    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should render title and four attribute descriptions', () => {
        const host = fixture.nativeElement as HTMLElement;
        const descriptions = host.querySelectorAll('li');

        expect(host.textContent).toContain('Descriptions des attributs');
        expect(descriptions.length).toBe(ATTRIBUTE_DESCRIPTION_COUNT);
        expect(descriptions[0].textContent).toContain('Vie');
        expect(descriptions[1].textContent).toContain('Rapidité');
        expect(descriptions[2].textContent).toContain('Attaque');
        expect(descriptions[3].textContent).toContain('Défense');
    });
});
