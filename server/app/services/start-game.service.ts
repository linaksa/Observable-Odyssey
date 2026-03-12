import { activeGameModel } from '@app/schemas/active-game';
import { IActiveGame } from '@common/activeGame';
import { Position } from '@common/character';
import { ItemType } from '@common/items';
import { Service } from 'typedi';


@Service()
export class StartGameService {
    // Logique pour initialiser une partie (ex: créer un état de jeu, assigner les joueurs, etc.)
    async initializeGame(gameId: string): Promise<void> {
        const activeGame = await activeGameModel.findById(gameId);
        await this.assignRandomStartPositions(activeGame);
        this.initializeTurnOrder(activeGame);
        await activeGame.save();
    }
    // Logique pour assigner des positions de départ aléatoires aux joueurs
    private async assignRandomStartPositions(activeGame: IActiveGame): Promise<void> {
        const spawnTiles = this.getSpawnTiles(activeGame);
        for (const player of activeGame.players) {
            const randomIndex = Math.floor(Math.random() * spawnTiles.length);
            const tile = spawnTiles.splice(randomIndex, 1)[0];
            player.positionGrille = tile;
            player.positionDepart = tile;
        }
    }
    // Logique pour déterminer l'ordre des tours
    private initializeTurnOrder(activeGame: IActiveGame): void {
        activeGame.turnOrder = [...activeGame.players].sort((a, b) => b.rapidityPoints - a.rapidityPoints).map((player) => player.name);
    }
    // Récupère toutes les positions de spawn possibles sur la carte
    private getSpawnTiles(activeGame: IActiveGame): Position[] {
        return activeGame.game.board.items
            .filter((item) => item.itemType === ItemType.StartingPosition)
            .map((item) => ({ x: item.y, y: item.x }));
    }
}
