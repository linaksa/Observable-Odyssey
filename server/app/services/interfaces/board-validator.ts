import { IBoard } from '@common/board';
import { ErrorCode } from '@common/error-codes';

export interface IBoardValidator {
    validate(board: IBoard): ErrorCode[];
}
