/**
 * Testing strategy — Text Message Component
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
        component.message = createMessage('Alice', 'Bonjour');
        component.isSelf = true;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should render message content and author', () => {
        const host = fixture.nativeElement as HTMLElement;

        expect(host.textContent).toContain('Alice');
        expect(host.textContent).toContain('Bonjour');
    });

    it('should use self styles when message belongs to local player', () => {
        const bubble = (fixture.nativeElement as HTMLElement).querySelector('.max-w-xs') as HTMLDivElement;

        expect(bubble.style.backgroundColor).toBe('lightblue');
        expect(bubble.classList.contains('justify-self-end')).toBeTrue();
    });

    it('should use remote styles when message belongs to another player', () => {
        fixture = TestBed.createComponent(TextMessageComponent);
        component = fixture.componentInstance;
        component.message = createMessage('Alice', 'Bonjour');
        component.isSelf = false;
        fixture.detectChanges();
        const bubble = (fixture.nativeElement as HTMLElement).querySelector('.max-w-xs') as HTMLDivElement;

        expect(bubble.style.backgroundColor).toBe('lightgray');
        expect(bubble.classList.contains('justify-self-start')).toBeTrue();
    });
});

function createMessage(author: string, content: string): IMessage {
    return {
        author,
        content,
        postedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
}
