import { activeGameModel } from '@app/schemas/active-game';
import { ICharacter } from '@common/character';
import { TEMPS_PREPA_TOUR, TEMPS_TOUR } from '@common/constants';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Service } from 'typedi';
import { MovementService } from './movement-service';
import { SocketService } from './socket.service';

@Service()
export class TurnService {
    private preparationTimers: Map<string, NodeJS.Timeout> = new Map();
    private turnTimers: Map<string, NodeJS.Timeout> = new Map();

    constructor(
        private socketService: SocketService,
        private movementService: MovementService,
    ) {}

    // logic for the 3-second delay before the start of a turn
    async startTurn(gameId: string) {
        const activeGame = await activeGameModel.findById(gameId);
        if (!activeGame) return;

        const player = this.getCurrentPlayer(activeGame);
        if (!player) return;

        // Always clear old timers before creating new ones.
        this.clearPreparationTimer(gameId);
        this.clearTurnTimer(gameId);

        // notify the room
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
    // logic for the 30-second turn timer
    private async beginTurn(gameId: string) {
        const activeGame = await activeGameModel.findById(gameId);
        if (!activeGame) return;

        const player = this.getCurrentPlayer(activeGame);
        if (!player) return;

        this.clearTurnTimer(gameId);
        // notify the room
        const namespace = this.socketService.getNamespace(Namespaces.Game);
        namespace.to(gameId).emit(SocketEvent.TurnStarted, {
            player: player.name,
            movementLeft: player?.movementLeft ?? 0,
        });
        const positions = this.movementService.getReachablePositions(player.name, gameId);

        namespace.to(gameId).emit(SocketEvent.ReachablePositions, {
            // TODO: change this to send only to the player
            player: player.name,
            positions,
        });

        const timer = setTimeout(() => {
            this.turnTimers.delete(gameId);
            this.endTurn(gameId); // if the player does not play within 30 seconds, move to the next turn
        }, TEMPS_TOUR);

        this.turnTimers.set(gameId, timer);
    }

    // end the turn and move to the next player
    async endTurn(gameId: string) {
        const activeGame = await activeGameModel.findById(gameId);
        if (!activeGame) return;

        this.clearPreparationTimer(gameId);
        this.clearTurnTimer(gameId);

        activeGame.currentPlayerIndex = (activeGame.currentPlayerIndex + 1) % activeGame.turnOrder.length;

        // Reset movement points for the next player
        const nextPlayer = activeGame.players.find((p) => p.name === activeGame.turnOrder[activeGame.currentPlayerIndex]);
        if (nextPlayer) {
            nextPlayer.movementLeft = nextPlayer.rapidityPoints;
        }

        await activeGame.save();

        this.startTurn(gameId); // move to the next player's turn
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
