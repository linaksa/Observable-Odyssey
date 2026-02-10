import { ValidationError } from '@app/error-types/validation-error';
import { game } from '@app/schemas/game';
import { GameType, IExistingGame, IGame, Visibility } from '@common/game';
import { Service } from 'typedi';
import { BoardService } from './board.service';
import { UpdatedGame } from './interfaces/updated-game';

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

        gameData.visibility = Visibility.Hidden;
        gameData.dateCreated = new Date();
        gameData.lastModifiedDate = new Date();

        return await game.create(gameData);
    }

    private validateGameData(gameData: IGame): void {
        if (!gameData.description?.length) {
            throw new ValidationError("Il n'y a pas de description");
        }

        if (!gameData.gameTitle?.length) {
            throw new ValidationError("Il n'y a pas de titre");
        }

        if (!Object.values(GameType).includes(gameData.gameMode)) {
            throw new ValidationError('Mode de jeu invalide');
        }

        if (!gameData.board) {
            throw new ValidationError("Il n'y a pas de carte");
        }

        if (!gameData.preview) {
            throw new ValidationError('Il manque une image de preview du jeu');
        }
        const boardErrors = this.boardService.validateBoard(gameData.board, gameData.gameMode);

        if (boardErrors.length > 0) {
            throw new ValidationError(boardErrors.join(' '));
        }
    }

    async updateGame(id: string, gameData: IGame): Promise<UpdatedGame> {
        const existingGame = await game.findById(id);
        if (!existingGame) {
            const newGame = await this.createGame(gameData);
            const gameToCreate = { game: newGame, created: true };
            return gameToCreate;
        }
        this.validateGameData(gameData);

        const updatedGame = await game.findByIdAndUpdate(
            id,
            {
                gameTitle: gameData.gameTitle,
                description: gameData.description,
                gameMode: gameData.gameMode,
                board: gameData.board,
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
