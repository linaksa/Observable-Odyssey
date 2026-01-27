import { game } from '@app/schemas/game';
import { GameType, IExistingGame, IGame, Visibility } from '@common/game';
import { Service } from 'typedi';
import { BoardService } from './board.service';

@Service()
export class GameService {
    constructor(private readonly boardService: BoardService) {}

    async getAllGames(): Promise<IExistingGame[]> {
        return await game.find({});
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
            throw new Error("Il n'y a pas de description");
        }

        if (!gameData.gameTitle?.length) {
            throw new Error("Il n'y a pas de titre");
        }

        if (!Object.values(GameType).includes(gameData.gameMode)) {
            throw new Error('Mode de jeu invalide');
        }

        if (!gameData.board) {
            throw new Error("Il n'y a pas de carte");
        }

        if (!gameData.preview) {
            throw new Error('Il manque une image de preview du jeu');
        }

        if (!this.boardService.validateBoard(gameData.board)) {
            throw new Error('Le terrain de jeu est invalide');
        }
    }

    async updateGame(id: string, gameData: IGame): Promise<IGame> {
        const existingGame = await game.findById(id);
        if (!existingGame) {
            return await this.createGame(gameData);// crée le jeu si il n'existe pas ou a été supprimé
        }
        this.validateGameData(gameData);

        return await game.findByIdAndUpdate(
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
    }

    async deleteGame(gameId: string): Promise<void> {
        const deletedGame = await game.findByIdAndDelete(gameId);
        if (!deletedGame) {
            throw new Error('Jeu déjà supprimé'); // on va devoir avertir l'utilisateur (alert maybe)
        }
    }

    async changeVisibility(id: string, visibility: Visibility): Promise<IGame> {
        const existingGame = await game.findById(id);
        if (!existingGame) {
            throw new Error('Jeu introuvable');
        }
        existingGame.visibility = visibility;
        existingGame.lastModifiedDate = new Date();
        return existingGame.save();
    }
}
