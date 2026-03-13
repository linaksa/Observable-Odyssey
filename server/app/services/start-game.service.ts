import { IActiveGame } from '@common/activeGame';
import { ICharacter, Position } from '@common/character';
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
        const playersByRapidity = [...activeGame.players].sort((a, b) => b.rapidityPoints - a.rapidityPoints);

        // Shuffle only tie groups so higher rapidity always stays first.
        for (let i = 0; i < playersByRapidity.length;) {
            let j = i + 1;
            while (j < playersByRapidity.length && playersByRapidity[j].rapidityPoints === playersByRapidity[i].rapidityPoints) {
                j++;
            }

            this.shuffleInPlace(playersByRapidity, i, j);
            i = j;
        }

        activeGame.turnOrder = playersByRapidity.map((player) => player.name);
    }

    private shuffleInPlace(players: ICharacter[], start: number, end: number): void {
        for (let i = end - 1; i > start; i--) {
            const j = start + Math.floor(Math.random() * (i - start + 1));
            [players[i], players[j]] = [players[j], players[i]];
        }
    }
    // Retrieves all possible spawn positions on the map
    private getSpawnTiles(activeGame: IActiveGame): Position[] {
        return activeGame.game.board.items.filter((item) => item.itemType === ItemType.StartingPosition).map((item) => ({ x: item.y, y: item.x }));
    }
}
