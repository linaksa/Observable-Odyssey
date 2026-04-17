/**
 * Testing strategy — keyboard-shortcuts utils
 *
 * Approach:
 * - Build synthetic keyboard events with controlled targets to isolate the utility's DOM-target predicate.
 * - Cover both matching and non-matching input targets without involving component integration.
 * - Keep assertions centered on the boolean contract returned by `isTypingInChatMessageInput`.
 *
 * Edge cases covered:
 * - Inputs marked with `data-chat-message-input` are recognized as chat typing context.
 * - Standard HTMLElements without that marker return `false`.
 * - Non-HTMLElement event targets are safely rejected.
 */
import { isTypingInChatMessageInput } from '@app/utils/keyboard-shortcuts.utils';

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
