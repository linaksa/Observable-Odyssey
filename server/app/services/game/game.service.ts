import { AppError } from '@app/error-types/app-error';
import { ValidationError } from '@app/error-types/validation-error';
import { game } from '@app/schemas/game';
import { BoardService } from '@app/services/board/board.service';
import { UpdatedGame } from '@app/services/interfaces/updated-game';
import { ErrorCode } from '@common/error-codes';
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from '@common/constants';
import { GameType, IExistingGame, IGame, Visibility } from '@common/game';
import { StatusCodes } from 'http-status-codes';
import { Service } from 'typedi';

@Service()
export class GameService {
    constructor(private readonly boardService: BoardService) {}

    async getAllGames(): Promise<IExistingGame[]> {
        return await game.find({});
    }

    async getGame(id: string): Promise<IExistingGame | null> {
        return await game.findById(id);
    }

    async createGame(gameData: IGame): Promise<IGame> {
        this.validateGameData(gameData);

        const existingGame = await game.findOne({ gameTitle: gameData.gameTitle });
        if (existingGame) {
            throw new ValidationError(ErrorCode.GameAlreadyExists);
        }

        gameData.visibility = Visibility.Hidden;
        gameData.dateCreated = new Date();
        gameData.lastModifiedDate = new Date();

        return await game.create(gameData);
    }

    private validateGameData(gameData: IGame): void {
        const errors: ErrorCode[] = [];
        const titleError = this.validateTitle(gameData.gameTitle);
        if (titleError) {
            errors.push(titleError);
        }

        const descriptionError = this.validateDescription(gameData.description);
        if (descriptionError) {
            errors.push(descriptionError);
        }

        const gameModeError = this.validateGameMode(gameData.gameMode);
        if (gameModeError) {
            errors.push(gameModeError);
        }

        errors.push(...this.validateBoard(gameData));

        if (errors.length > 0) {
            throw new ValidationError(errors);
        }
    }

    private validateTitle(title: string): ErrorCode | undefined {
        const trimmed = title?.trim();
        if (!trimmed?.length) return ErrorCode.GameTitleMissing;
        if (trimmed.length > MAX_TITLE_LENGTH) return ErrorCode.GameTitleTooLong;
        return undefined;
    }

    private validateDescription(description: string): ErrorCode | undefined {
        const trimmed = description?.trim();
        if (!trimmed?.length) return ErrorCode.GameDescriptionMissing;
        if (trimmed.length > MAX_DESCRIPTION_LENGTH) return ErrorCode.GameDescriptionTooLong;
        return undefined;
    }

    private validateGameMode(gameMode: GameType): ErrorCode | undefined {
        if (!Object.values(GameType).includes(gameMode)) return ErrorCode.GameModeInvalid;
        return undefined;
    }

    private validateBoard(gameData: IGame): ErrorCode[] {
        if (!gameData.board) return [ErrorCode.GameBoardMissing];

        return this.boardService.validateBoard(gameData.board, gameData.gameMode);
    }

    async updateGame(id: string, gameData: IGame): Promise<UpdatedGame> {
        const existingGame = await game.findById(id);
        if (!existingGame) {
            const newGame = await this.createGame(gameData);
            const gameToCreate = { game: newGame, created: true };
            return gameToCreate;
        }

        this.validateGameData(gameData);

        // Check if another game with the same title exists (excluding the current game)
        const duplicateGame = await game.findOne({
            gameTitle: gameData.gameTitle,
            _id: { $ne: id },
        });
        if (duplicateGame) {
            throw new ValidationError(ErrorCode.GameAlreadyExists);
        }

        const updatedGame = await game.findByIdAndUpdate(
            id,
            {
                gameTitle: gameData.gameTitle,
                description: gameData.description,
                gameMode: gameData.gameMode,
                board: gameData.board,
                visibility: Visibility.Hidden,
                lastModifiedDate: new Date(),
            },
            { returnDocument: 'after' },
        );

        const gameToUpdate = { game: updatedGame, created: false };
        return gameToUpdate;
    }

    async deleteGame(gameId: string): Promise<void> {
        const deletedGame = await game.findByIdAndDelete(gameId);
        if (!deletedGame) {
            throw new AppError([ErrorCode.GameAlreadyDeleted], StatusCodes.NOT_FOUND);
        }
    }

    async changeVisibility(id: string, visibility: Visibility): Promise<IGame> {
        const existingGame = await game.findById(id);
        if (!existingGame) {
            throw new AppError([ErrorCode.GameNotFound], StatusCodes.NOT_FOUND);
        }
        const validVisibilities = [Visibility.Viewable, Visibility.Hidden];
        if (!validVisibilities.includes(visibility)) {
            throw new ValidationError(ErrorCode.GameVisibilityInvalid);
        }
        existingGame.visibility = visibility;
        existingGame.lastModifiedDate = new Date();
        return existingGame.save();
    }
}
