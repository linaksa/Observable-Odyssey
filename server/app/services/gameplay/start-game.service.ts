import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { IActiveGame } from '@common/activeGame';
import { ICharacter, Position, Team } from '@common/character';
import { ItemType } from '@common/items';
import { Service } from 'typedi';

@Service()
export class StartGameService {
    constructor(private readonly activeGameService: ActiveGameService) {}
    // Logic to initialize a game (e.g., create a game state, assign players, etc.)
    async initializeGame(gameId: string): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (activeGame.game.gameMode === 'ctf') {
            await this.assignTeamsForCTF(activeGame);
        }
        await this.assignRandomStartPositions(activeGame);
        this.initializeTurnOrder(activeGame);
        activeGame.startedAt = new Date();
        await this.activeGameService.saveActiveGameById(gameId, activeGame);
    }
    // Logic to assign teams for CTF mode
    private async assignTeamsForCTF(activeGame: IActiveGame): Promise<void> {
        const half = 0.5;
        const players = activeGame.players;
        const shuffledPlayers = [...players].sort(() => Math.random() - half);
        const midIndex = Math.ceil(shuffledPlayers.length / 2);
        const teamA = shuffledPlayers.slice(0, midIndex);
        const teamB = shuffledPlayers.slice(midIndex);

        teamA.forEach((player) => (player.team = Team.RED));
        teamB.forEach((player) => (player.team = Team.BLUE));
    }
    // Logic to assign random starting positions to players
    private async assignRandomStartPositions(activeGame: IActiveGame): Promise<void> {
        const spawnTiles = this.getSpawnTiles(activeGame);
        for (const player of activeGame.players) {
            const randomIndex = Math.floor(Math.random() * spawnTiles.length);
            const tile = spawnTiles.splice(randomIndex, 1)[0];
            player.positionGrille = tile;
            player.positionDepart = tile;

            player.visitedCells.push(`${tile.x},${tile.y}`);
        }
    }
    // Logic to determine the turn order
    private initializeTurnOrder(activeGame: IActiveGame): void {
        const playersByRapidity = [...activeGame.players].sort((a, b) => b.rapidityPoints - a.rapidityPoints);

        // Shuffle only tie groups so higher rapidity always stays first.
        for (let i = 0; i < playersByRapidity.length; ) {
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
        return activeGame.game.board.items.filter((item) => item.itemType === ItemType.StartingPosition).map((item) => ({ x: item.x, y: item.y }));
    }
}
