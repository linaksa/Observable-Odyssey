import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { ICharacter, Position } from '@common/character';
import { Service } from 'typedi';
import { ActiveGameService } from './active-game.service';

@Service()
export class StartGameService {
    constructor(private readonly activeGameService: ActiveGameService) {}

    // Logique pour initialiser une partie (ex: creer un etat de jeu, assigner les joueurs, etc.)
    initializeGame(gameId: string): void {
        const activeGame = this.activeGameService.getActiveGameFromMemory(gameId);
        if (!activeGame) {
            return;
        }
        this.assignRandomStartPositions(activeGame);
        activeGame.players = this.setPlayerOrder(activeGame.players);
        activeGame.turnOrder = activeGame.players.map((player) => player.name);
        activeGame.currentPlayerIndex = 0;
    }

    // Logique pour assigner des positions de départ aléatoires aux joueurs
    private assignRandomStartPositions(activeGame: IActiveGame): void {
        const spawnTiles = this.getSpawnTiles(activeGame);
        for (const player of activeGame.players) {
            const randomIndex = Math.floor(Math.random() * spawnTiles.length);
            const tile = spawnTiles.splice(randomIndex, 1)[0];
            player.positionGrille = tile;
            player.positionDepart = tile;
        }
    }
    // Logique pour déterminer l'ordre des tours

    setPlayerOrder(players: ICharacter[]): ICharacter[] {
        return this.orderPlayers(players);
    }

    private orderPlayers(players: ICharacter[]): ICharacter[] {
        const sorted = [...players].sort((a, b) => b.rapidityPoints - a.rapidityPoints);
        let i = 0;
        while (i < sorted.length) {
            const rapidity = sorted[i].rapidityPoints;
            let j = i + 1;
            while (j < sorted.length && sorted[j].rapidityPoints === rapidity) {
                j++;
            }
            this.shuffleInPlace(sorted, i, j);
            i = j;
        }
        return sorted;
    }

    private shuffleInPlace(items: ICharacter[], start: number, end: number): void {
        for (let i = end - 1; i > start; i--) {
            const j = start + Math.floor(Math.random() * (i - start + 1));
            const temp = items[i];
            items[i] = items[j];
            items[j] = temp;
        }
    }

    // Récupère toutes les positions de spawn possibles sur la carte
    private getSpawnTiles(activeGame: IActiveGame): Position[] {
        const walkable: Position[] = [];
        for (let x = 0; x < activeGame.game.board.cells.length; x++) {
            for (let y = 0; y < activeGame.game.board.cells[x].length; y++) {
                const cell = activeGame.game.board.cells[x][y];
                if (cell !== CellType.Wall && cell !== CellType.OpenDoor && cell !== CellType.ClosedDoor) {
                    walkable.push({ x, y });
                }
            }
        }
        return walkable;
    }
}
