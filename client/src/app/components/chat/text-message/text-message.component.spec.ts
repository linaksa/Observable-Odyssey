/**
 * Testing strategy — Text Message Component
 *
 * Approach:
 * - Render the standalone component with required signal inputs.
 * - Assert that input signals preserve identity and values passed from the parent.
 *
 * Edge cases covered:
 * - Boolean input should support both self and non-self states.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IMessage } from '@common/message';
import { TextMessageComponent } from './text-message.component';

describe('TextMessageComponent', () => {
    let component: TextMessageComponent;
    let fixture: ComponentFixture<TextMessageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TextMessageComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TextMessageComponent);
        component = fixture.componentInstance;
    });

    it('should expose required inputs as signals', () => {
        const message: IMessage = {
            author: 'Alice',
            content: 'Bonjour',
            postedAt: new Date('2024-01-01T00:00:00.000Z'),
        };

        // Nominal case: parent provides all required values.
        fixture.componentRef.setInput('message', message);
        fixture.componentRef.setInput('isSelf', true);
        fixture.detectChanges();

        expect(component.message()).toBe(message);
        expect(component.isSelf()).toBeTrue();

        // Edge case: explicit false value should be preserved.
        fixture.componentRef.setInput('isSelf', false);
        fixture.detectChanges();

        expect(component.isSelf()).toBeFalse();
    });
});
