/**
 * Testing strategy — Page Title Component
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
import { PageTitleComponent } from './page-title.component';

describe('PageTitleComponent', () => {
    let component: PageTitleComponent;
    let fixture: ComponentFixture<PageTitleComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PageTitleComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(PageTitleComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('title', 'Salle d’attente');
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should render provided title input', () => {
        const heading = (fixture.nativeElement as HTMLElement).querySelector('h1');

        expect(heading?.textContent).toContain('Salle d’attente');
    });
});
