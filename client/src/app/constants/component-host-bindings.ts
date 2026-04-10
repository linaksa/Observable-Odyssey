export const GAME_GRID_PANEL_HOST_BINDINGS = {
    class: 'relative flex flex-col min-h-0 min-w-0',
    ['(window:keydown)']: 'handleKeyboard($event)',
    ['(document:click)']: 'handleDocumentClick($event)',
} as const;

export const GAME_PAGE_HOST_BINDINGS = {
    ['(window:keydown)']: 'handleKeyDown($event)',
    ['(window:beforeunload)']: 'handlePageExit()',
} as const;

export const GAME_COMBAT_POPUP_HOST_BINDINGS = {
    class: 'contents',
} as const;

export const GAME_COMBAT_OUTCOME_HOST_BINDINGS = {
    class: 'contents',
} as const;

export const GAME_ENDED_HOST_BINDINGS = {
    class: 'contents',
} as const;

export const GAME_ACTION_PANEL_HOST_BINDINGS = {
    class: 'flex flex-col gap-4 min-w-0 min-h-0',
} as const;

export const GAME_INFO_PANEL_HOST_BINDINGS = {
    class: 'min-w-0 min-h-0',
} as const;
