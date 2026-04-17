/**
 * Testing strategy — Editor Form Panel Component
 *
 * Approach:
 * - Render the panel and verify that exposed output emitters are functional.
 *
 * Edge cases covered:
 * - Both panel-level events can be emitted independently.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditorFormPanelComponent } from './editor-form-panel.component';

describe('EditorFormPanelComponent', () => {
    let component: EditorFormPanelComponent;
    let fixture: ComponentFixture<EditorFormPanelComponent>;

    beforeEach(async () => {
        TestBed.overrideComponent(EditorFormPanelComponent, {
            set: {
                template: '',
                imports: [],
            },
        });

        await TestBed.configureTestingModule({
            imports: [EditorFormPanelComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(EditorFormPanelComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should emit submit and revert requests independently', () => {
        const submitSpy = jasmine.createSpy('submitSpy');
        const revertSpy = jasmine.createSpy('revertSpy');

        component.submitRequested.subscribe(submitSpy);
        component.revertRequested.subscribe(revertSpy);

        // Nominal case: submit event is emitted.
        component.submitRequested.emit();
        expect(submitSpy).toHaveBeenCalledTimes(1);
        expect(revertSpy).not.toHaveBeenCalled();

        // Edge case: revert event remains independent from submit.
        component.revertRequested.emit();
        expect(revertSpy).toHaveBeenCalledTimes(1);
    });
});
