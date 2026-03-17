import { ValidationError } from '@app/error-types/validation-error';
import { game } from '@app/schemas/game';
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from '@common/constants';
import { GameType, IExistingGame, IGame, Visibility } from '@common/game';
import { Service } from 'typedi';
import { BoardService } from '@app/services/board/board.service';
import { UpdatedGame } from '@app/services/interfaces/updated-game';

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
            throw new ValidationError('Un jeu avec ce nom existe déjà');
        }

        gameData.visibility = Visibility.Hidden;
        gameData.dateCreated = new Date();
        gameData.lastModifiedDate = new Date();

        return await game.create(gameData);
    }

    private validateGameData(gameData: IGame): void {
        this.validateTitle(gameData.gameTitle);
        this.validateDescription(gameData.description);
        this.validateGameMode(gameData.gameMode);
        this.validateBoard(gameData);
    }

    private validateTitle(title: string): void {
        const trimmed = title?.trim();
        if (!trimmed?.length) throw new ValidationError("Il n'y a pas de titre");
        if (trimmed.length > MAX_TITLE_LENGTH) throw new ValidationError('Le titre ne peut pas dépasser 50 caractères');
    }

    private validateDescription(description: string): void {
        const trimmed = description?.trim();
        if (!trimmed?.length) throw new ValidationError("Il n'y a pas de description");
        if (trimmed.length > MAX_DESCRIPTION_LENGTH) throw new ValidationError('La description ne peut pas dépasser 200 caractères');
    }

    private validateGameMode(gameMode: GameType): void {
        if (!Object.values(GameType).includes(gameMode)) throw new ValidationError('Mode de jeu invalide');
    }

    private validateBoard(gameData: IGame): void {
        if (!gameData.board) throw new ValidationError("Il n'y a pas de carte");
        if (!gameData.preview) throw new ValidationError('Il manque une image de preview du jeu');

        const boardErrors = this.boardService.validateBoard(gameData.board, gameData.gameMode);
        if (boardErrors.length > 0) throw new ValidationError(boardErrors.join(' '));
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
            throw new ValidationError('Un jeu avec ce nom existe déjà');
        }

        const updatedGame = await game.findByIdAndUpdate(
            id,
            {
                gameTitle: gameData.gameTitle,
                description: gameData.description,
                gameMode: gameData.gameMode,
                board: gameData.board,
                visibility: Visibility.Hidden,
                preview: gameData.preview,
                lastModifiedDate: new Date(),
            },
            { new: true },
        );

        const gameToUpdate = { game: updatedGame, created: false };
        return gameToUpdate;
    }

    async deleteGame(gameId: string): Promise<void> {
        const deletedGame = await game.findByIdAndDelete(gameId);
        if (!deletedGame) {
            throw new Error('Jeu déjà supprimé');
        }
    }

    async changeVisibility(id: string, visibility: Visibility): Promise<IGame> {
        const existingGame = await game.findById(id);
        if (!existingGame) {
            throw new Error('Jeu introuvable');
        }
        const validVisibilities = [Visibility.Viewable, Visibility.Hidden];
        if (!validVisibilities.includes(visibility)) {
            throw new ValidationError('Visibilité invalide');
        }
        existingGame.visibility = visibility;
        existingGame.lastModifiedDate = new Date();
        return existingGame.save();
    }
}
