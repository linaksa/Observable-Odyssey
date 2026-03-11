import { ICharacter } from '@common/character';
import { TEMPS_PREPA_TOUR, TEMPS_TOUR } from '@common/constants';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Service } from 'typedi';
import { ActiveGameService } from './active-game.service';
import { MovementService } from './movement-service';
import { SocketService } from './socket.service';

@Service()
export class TurnService {
    private preparationTimers: Map<string, NodeJS.Timeout> = new Map();
    private turnTimers: Map<string, NodeJS.Timeout> = new Map();

    constructor(
        private activeGameService: ActiveGameService,
        private socketService: SocketService,
        private movementService: MovementService,
    ) {}

    // logique pour le delai de 3 secondes avant le debut du tour
    startTurn(gameId: string) {
        const activeGame = this.activeGameService.getActiveGameFromMemory(gameId);
        if (!activeGame) return;

        const player = this.getCurrentPlayer(activeGame);
        if (!player) return;

        // Toujours nettoyer les anciens timers avant d'en creer de nouveaux.
        this.clearPreparationTimer(gameId);
        this.clearTurnTimer(gameId);

        // notifier la room
        const namespace = this.socketService.getNamespace(Namespaces.Game);
        namespace.to(gameId).emit(SocketEvent.TurnPreparing, {
            player: player.name,
        });

        const preparationTimer = setTimeout(() => {
            this.preparationTimers.delete(gameId);
            this.beginTurn(gameId);
        }, TEMPS_PREPA_TOUR);

        this.preparationTimers.set(gameId, preparationTimer);
    }
    // logique pour le tour 30 de 30 sec
    private beginTurn(gameId: string) {
        const activeGame = this.activeGameService.getActiveGameFromMemory(gameId);
        if (!activeGame) return;

        const player = this.getCurrentPlayer(activeGame);
        if (!player) return;

        this.clearTurnTimer(gameId);
        // notifier la room
        const namespace = this.socketService.getNamespace(Namespaces.Game);
        namespace.to(gameId).emit(SocketEvent.TurnStarted, {
            player: player.name,
        });
        const positions = this.movementService.getReachablePositions(player.name, gameId);

        namespace.to(gameId).emit(SocketEvent.ReachablePositions, {
            // changer ca pour que ca envoie seulement au joueur
            player: player.name,
            positions,
        });

        const timer = setTimeout(() => {
            this.turnTimers.delete(gameId);
            this.endTurn(gameId); // si le joueur ne joue pas dans les 30 secondes, on passe au tour suivant
        }, TEMPS_TOUR);

        this.turnTimers.set(gameId, timer);
    }

    // finir le tour puis passer au joueur suivant
    endTurn(gameId: string) {
        const activeGame = this.activeGameService.getActiveGameFromMemory(gameId);
        if (!activeGame) return;

        this.clearPreparationTimer(gameId);
        this.clearTurnTimer(gameId);

        activeGame.currentPlayerIndex = (activeGame.currentPlayerIndex + 1) % activeGame.turnOrder.length;

        this.startTurn(gameId); // on passe au tour du joueur suivant
    }

    private getCurrentPlayer(activeGame: { players: ICharacter[]; currentPlayerIndex: number; turnOrder: string[] }): ICharacter | undefined {
        const playerName = activeGame.turnOrder[activeGame.currentPlayerIndex];
        if (!playerName) {
            return undefined;
        }

        return activeGame.players.find((player) => player.name === playerName);
    }

    private clearPreparationTimer(gameId: string): void {
        const timer = this.preparationTimers.get(gameId);
        if (!timer) {
            return;
        }
        clearTimeout(timer);
        this.preparationTimers.delete(gameId);
    }

    private clearTurnTimer(gameId: string): void {
        const timer = this.turnTimers.get(gameId);
        if (!timer) {
            return;
        }
        clearTimeout(timer);
        this.turnTimers.delete(gameId);
    }
}
