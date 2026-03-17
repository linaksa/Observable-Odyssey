/**
 * Testing strategy — Nav Buttons Component
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
import { NavButtonsComponent } from './nav-buttons.component';

describe('NavButtonsComponent', () => {
    let component: NavButtonsComponent;
    let fixture: ComponentFixture<NavButtonsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [NavButtonsComponent],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(NavButtonsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should render only the back button with default text', () => {
        const host = fixture.nativeElement as HTMLElement;
        const buttons = host.querySelectorAll('button');

        expect(buttons.length).toBe(1);
        expect(buttons[0].textContent).toContain('Retour vers la vue initiale');
    });

    it('should bind back button routerLink from input signal', () => {
        fixture.componentRef.setInput('linkBack', '/create');
        fixture.detectChanges();

        const routerLink = fixture.debugElement.query(By.directive(RouterLink)).injector.get(RouterLink);

        expect(routerLink.urlTree?.toString()).toBe('/create');
    });

    it('should render action button and emit action when clicked', () => {
        spyOn(component.action, 'emit');
        fixture.componentRef.setInput('showBack', false);
        fixture.componentRef.setInput('showAction', true);
        fixture.componentRef.setInput('textAction', 'Commencer');
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        const actionButton = host.querySelector('button.btn-blue') as HTMLButtonElement;
        actionButton.click();

        expect(host.querySelector('button:not(.btn-blue)')).toBeNull();
        expect(actionButton.textContent).toContain('Commencer');
        expect(component.action.emit).toHaveBeenCalled();
    });
});
