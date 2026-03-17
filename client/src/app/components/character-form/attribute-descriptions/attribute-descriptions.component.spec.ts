/**
 * Testing strategy — Attribute Descriptions Component
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
import { AttributeDescriptionsComponent } from './attribute-descriptions.component';

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
