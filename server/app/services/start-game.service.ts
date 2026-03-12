import { IActiveGame } from '@common/activeGame';
import { Position } from '@common/character';
import { ItemType } from '@common/items';
import { Service } from 'typedi';
import { ActiveGameService } from './active-game.service';

@Service()
export class StartGameService {
    constructor(private readonly activeGameService: ActiveGameService) {}
    // Logic to initialize a game (e.g., create a game state, assign players, etc.)
    async initializeGame(gameId: string): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        await this.assignRandomStartPositions(activeGame);
        this.initializeTurnOrder(activeGame);
        await this.activeGameService.saveActiveGameById(gameId, activeGame);
    }
    // Logic to assign random starting positions to players
    private async assignRandomStartPositions(activeGame: IActiveGame): Promise<void> {
        const spawnTiles = this.getSpawnTiles(activeGame);
        for (const player of activeGame.players) {
            const randomIndex = Math.floor(Math.random() * spawnTiles.length);
            const tile = spawnTiles.splice(randomIndex, 1)[0];
            player.positionGrille = tile;
            player.positionDepart = tile;
        }
    }
    // Logic to determine the turn order
    private initializeTurnOrder(activeGame: IActiveGame): void {
        activeGame.turnOrder = [...activeGame.players].sort((a, b) => b.rapidityPoints - a.rapidityPoints).map((player) => player.name);
    }
    // Retrieves all possible spawn positions on the map
    private getSpawnTiles(activeGame: IActiveGame): Position[] {
        return activeGame.game.board.items.filter((item) => item.itemType === ItemType.StartingPosition).map((item) => ({ x: item.y, y: item.x }));
    }
}
