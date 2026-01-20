import { game } from '@app/schemas/game';
import { GameType, IGame, Visibility } from '@common/game';
import { Service } from 'typedi';
import { BoardService } from './board.service';

@Service()
export class GameService {

    constructor(private readonly boardService: BoardService) {}

    async getAllGames(): Promise<IGame[]> {
        return await game.find({})
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
}
