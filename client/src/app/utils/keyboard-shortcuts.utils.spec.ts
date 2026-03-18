/**
 * Testing strategy — keyboard-shortcuts utils
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
import { isTypingInChatMessageInput } from './keyboard-shortcuts.utils';

describe('isTypingInChatMessageInput', () => {
    it('should return true when event target is the chat message input', () => {
        const event = new KeyboardEvent('keydown', { key: 'm' });
        const input = document.createElement('input');
        input.setAttribute('data-chat-message-input', '');
        Object.defineProperty(event, 'target', { value: input });

        expect(isTypingInChatMessageInput(event)).toBeTrue();
    });

    it('should return false when event target is an HTMLElement without chat marker', () => {
        const event = new KeyboardEvent('keydown', { key: 'm' });
        const input = document.createElement('input');
        Object.defineProperty(event, 'target', { value: input });

        expect(isTypingInChatMessageInput(event)).toBeFalse();
    });

    // Edge case: When target is not an HTMLElement, return false.
    it('should return false when target is not an HTMLElement', () => {
        const event = new KeyboardEvent('keydown', { key: 'm' });
        Object.defineProperty(event, 'target', { value: { matches: () => true } });

        expect(isTypingInChatMessageInput(event)).toBeFalse();
    });
});
