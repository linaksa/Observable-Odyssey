import { game, IGame } from '@app/schemas/game';
import { Service } from 'typedi';


@Service()
export class GameService {

    async updateGame(id: string, gameData: unknown): Promise<unknown> {
        throw new Error('Not implemented');
    }

    async deleteGame(gameId: string): Promise<void> {
        const existingGame = await game.findById(gameId);
        if (!existingGame) {
            throw new Error('jeu a déja été supprimé');
        }
        await game.deleteOne({ _id: gameId });
    }

    async changeVisibility(id: string, visibility: 'viewable' | 'hidden'): Promise<IGame> {
        const existingGame = await game.findById(id);
        if (!existingGame) {
            throw new Error('Jeu introuvable');
        }
        existingGame.visibility = visibility;
        existingGame.lastModifiedDate = new Date();
        return existingGame.save();
    }
}
