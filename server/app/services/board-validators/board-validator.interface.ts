import { IBoard } from '@common/board';

export interface IBoardValidator {
    validate(board: IBoard): string[];
}
