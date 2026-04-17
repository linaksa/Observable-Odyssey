import { ToolOption } from '@app/constants/grid-editor';

export const TOOL_DESC_TOOL_TIP: Readonly<Record<ToolOption, string>> = {
    [ToolOption.Placement]: 'Applicateur de tuile',
    [ToolOption.Objects]: "Placement d'objet",
};

export const TOOL_ICON: Readonly<Record<ToolOption, string>> = {
    [ToolOption.Placement]: 'assets/editor/tile.svg',
    [ToolOption.Objects]: 'assets/editor/cube.svg',
};

export const EDITION_PAGE_BUTTON_TIMEOUT_MS = 3000;
