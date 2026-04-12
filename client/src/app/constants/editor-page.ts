import { ToolOption } from '@app/constants/grid-editor';

export const TOOL_DESC_TOOL_TIP: Readonly<Record<ToolOption, string>> = {
    [ToolOption.Placement]: "Placement d'une tuile",
    [ToolOption.Objects]: "Placement d'un objet",
};

export const EDITION_PAGE_BUTTON_TIMEOUT_MS = 3000;
