import { GridSize } from '@app/constants/grid-editor';

export enum DimensionSize {
    Small = 'small',
    Medium = 'medium',
    Large = 'large',
}

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
