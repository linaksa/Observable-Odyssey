import { DimensionSize } from '@app/components/admin/game-creation-dialog/game-creation-dialog.types';
import { GridSize } from '@app/constants/grid-editor';

export interface DimensionConfig {
    label: string;
    displaySize: string;
    numberOfPlayers: string;
    size: GridSize;
}

export interface DimensionOption {
    value: DimensionSize;
    label: string;
    displaySize: string;
}
