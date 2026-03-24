import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { ICharacter } from '@common/character';
import { TEMPS_PREPA_TOUR, TEMPS_TOUR } from '@common/constants';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { ITurnStartedPayload } from '@common/socket-payloads';
import { Service } from 'typedi';

@Service()
export class TurnService {
    private preparationTimers: Map<string, NodeJS.Timeout> = new Map();
    private turnTimers: Map<string, NodeJS.Timeout> = new Map();

    constructor(
        private readonly socketService: SocketService,
        private readonly activeGameService: ActiveGameService,
    ) {}

    // logic for the 3-second delay before the start of a turn
    async startTurn(gameId: string) {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) return;
        if (activeGame.isFinished) return;

        activeGame.turnIsInPreparation = true;
        await this.activeGameService.saveActiveGameById(gameId, activeGame);

        const player = this.getCurrentPlayer(activeGame);
        if (!player) return;

        if (activeGame.isFinished) {
            return;
        }
        // If the scheduled player has since abandoned, skip their turn immediately
        if (player.hasAbandoned) {
            await this.endTurn(gameId);
        }

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
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) return;

        if (activeGame.isFinished) {
            return;
        }

        activeGame.turnIsInPreparation = false;
        await this.activeGameService.saveActiveGameById(gameId, activeGame);

        const player = this.getCurrentPlayer(activeGame);
        if (!player) return;

        this.clearTurnTimer(gameId);
        // notify the room
        const namespace = this.socketService.getNamespace(Namespaces.Game);
        const turnStartedPayload: ITurnStartedPayload = {
            player: player.name,
            movementLeft: player?.movementLeft ?? 0,
            actionLeft: player?.actionsLeft ?? 0,
        };
        namespace.to(gameId).emit(SocketEvent.TurnStarted, turnStartedPayload);

        const timer = setTimeout(() => {
            this.turnTimers.delete(gameId);
            this.endTurn(gameId); // if the player does not play within 30 seconds, move to the next turn
        }, TEMPS_TOUR);

        this.turnTimers.set(gameId, timer);
    }

    // end the turn and move to the next player
    async endTurn(gameId: string) {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) return;

        // Always clear timers, even if the game is already finished
        this.clearPreparationTimer(gameId);
        this.clearTurnTimer(gameId);

        if (activeGame.isFinished) {
            return;
        }

        const totalPlayers = activeGame.turnOrder.length;

        let nextIndex = activeGame.currentPlayerIndex;
        for (let i = 0; i < totalPlayers; i++) {
            nextIndex = (nextIndex + 1) % totalPlayers;

            const playerName = activeGame.turnOrder[nextIndex];
            const player = activeGame.players.find((p) => p.name === playerName);

            if (player && !player.hasAbandoned) {
                break;
            }
        }

        activeGame.currentPlayerIndex = nextIndex;

        const nextPlayer = activeGame.players.find((p) => p.name === activeGame.turnOrder[nextIndex]);

        if (nextPlayer) {
            nextPlayer.movementLeft = nextPlayer.rapidityPoints;
            nextPlayer.actionsLeft = 1;
        }

        await this.activeGameService.saveActiveGameById(gameId, activeGame);

        this.startTurn(gameId);
    }

    async suspendTurn(gameId: string): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) return;

        const namespace = this.socketService.getNamespace(Namespaces.Game);
        namespace.to(gameId).emit(SocketEvent.SuspendTurn);
    }

    async continueTurn(gameId: string): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) return;

        const namespace = this.socketService.getNamespace(Namespaces.Game);
        namespace.to(gameId).emit(SocketEvent.TurnStarted, {
            player: this.getCurrentPlayer(activeGame)?.name,
            movementLeft: this.getCurrentPlayer(activeGame)?.movementLeft ?? 0,
            actionLeft: this.getCurrentPlayer(activeGame)?.actionsLeft ?? 0,
        });
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
