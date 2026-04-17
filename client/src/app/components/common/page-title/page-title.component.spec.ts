/**
 * Testing strategy — Page Title Component
 *
 * Approach:
 * - Instantiate the standalone title component and drive it through the title input signal.
 * - Validate the rendered heading text in the DOM after input updates.
 * - Keep the suite lightweight as a presentation-component contract check.
 *
 * Edge cases covered:
 * - Confirms component creation succeeds with only direct input configuration.
 * - Ensures accented French title content is rendered correctly in the <h1>.
 * - Protects against regressions where title input stops binding to the template.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageTitleComponent } from '@app/components/common/page-title/page-title.component';

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

    // Edge case: Minimal setup path with isolated TestBed configuration. Verifies instantiation succeeds without missing dependencies.
    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should render provided title input', () => {
        const heading = (fixture.nativeElement as HTMLElement).querySelector('h1');

        expect(heading?.textContent).toContain('Salle d’attente');
    });
});
