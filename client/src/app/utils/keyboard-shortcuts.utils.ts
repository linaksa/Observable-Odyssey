export function isTypingInChatMessageInput(event: KeyboardEvent): boolean {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return false;

    return target.matches('[data-chat-message-input]');
}
