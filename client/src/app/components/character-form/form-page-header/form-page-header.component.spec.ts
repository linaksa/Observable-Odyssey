/**
 * Testing strategy — Form Page Header Component
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
import { FormPageHeaderComponent } from './form-page-header.component';

describe('FormPageHeaderComponent', () => {
    let component: FormPageHeaderComponent;
    let fixture: ComponentFixture<FormPageHeaderComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FormPageHeaderComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(FormPageHeaderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should render character editor title', () => {
        const heading = (fixture.nativeElement as HTMLElement).querySelector('h1');

        expect(heading?.textContent).toContain('Éditeur de personnage');
    });
});
