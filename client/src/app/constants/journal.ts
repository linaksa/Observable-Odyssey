export enum JournalTab {
    Chat = 'chat',
    Journal = 'journal',
}

export const JOURNAL_DEFAULT_TAB = JournalTab.Chat;
export const JOURNAL_DATE_FORMAT = 'HH:mm:ss';
export const JOURNAL_EMPTY_MESSAGE = 'Aucun evenement pour le moment.';
export const JOURNAL_TAB_LABELS: Readonly<Record<JournalTab, string>> = {
    [JournalTab.Chat]: 'Clavardage',
    [JournalTab.Journal]: 'Journal',
};
