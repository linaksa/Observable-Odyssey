import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { GameplayLogService } from '@app/services/realtime/gameplay-log.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/active-game';
import { ICharacter } from '@common/character';
import { MAX_PLAYER_ACTIONS, TURN_PREPARATION_TIME_MS, TURN_TIME_MS } from '@common/constants';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { ITurnPreparingPayload, ITurnStartedPayload } from '@common/socket-payloads';
import { Service } from 'typedi';
import { SanctuaryService } from '@app/services/gameplay/sanctuary-service';

export type VirtualPlayerTurnHandler = (player: ICharacter, activeGame: IActiveGame) => Promise<void>;
export type TurnEndedHandler = (gameId: string) => Promise<void> | void;

@Service()
export class TurnService {
    private preparationTimers: Map<string, NodeJS.Timeout> = new Map();
    private turnTimers: Map<string, NodeJS.Timeout> = new Map();
    private combatTimers: Map<string, NodeJS.Timeout> = new Map();
    private virtualPlayerTurnHandler?: VirtualPlayerTurnHandler;
    private turnEndedHandler?: TurnEndedHandler;

    constructor(
        private readonly socketService: SocketService,
        private readonly activeGameService: ActiveGameService,
        private readonly sanctuaryService: SanctuaryService,
        private readonly gameplayLogService: GameplayLogService,
    ) {}

    setVirtualPlayerTurnHandler(handler: VirtualPlayerTurnHandler): void {
        this.virtualPlayerTurnHandler = handler;
    }

    setTurnEndedHandler(handler: TurnEndedHandler): void {
        this.turnEndedHandler = handler;
    }

    // logic for the 3-second delay before the start of a turn
    async startTurn(gameId: string) {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) return;
        if (activeGame.isFinished) return;

        activeGame.turnIsInPreparation = true;
        this.sanctuaryService.onTurnStarted(activeGame);
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
        this.clearTimerFromMap(activeGame, this.preparationTimers);
        this.clearTimerFromMap(activeGame, this.turnTimers);

        // notify the room
        const namespace = this.socketService.getNamespace(Namespaces.Game);
        const turnPreparingPayload: ITurnPreparingPayload = {
            player: player.name,
        };
        namespace.to(gameId).emit(SocketEvent.TurnPreparing, turnPreparingPayload);

        const preparationTimer = setTimeout(() => {
            this.preparationTimers.delete(gameId);
            this.beginTurn(gameId);
        }, TURN_PREPARATION_TIME_MS);

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
        activeGame.turnStartTimeStamp = Date.now();
        activeGame.totalTurnCount = (activeGame.totalTurnCount ?? 0) + 1;

        await this.activeGameService.saveActiveGameById(gameId, activeGame);

        const player = this.getCurrentPlayer(activeGame);
        if (!player) return;

        this.clearTimerFromMap(activeGame, this.turnTimers);
        // notify the room
        const namespace = this.socketService.getNamespace(Namespaces.Game);
        const turnStartedPayload: ITurnStartedPayload = {
            player: player.name,
            movementLeft: player?.movementLeft ?? 0,
            actionLeft: player?.actionsLeft ?? 0,
            timeLeft: null,
        };
        namespace.to(gameId).emit(SocketEvent.TurnStarted, turnStartedPayload);
        this.gameplayLogService.emitGameLogToRoom(gameId, `Début du tour de ${player.name}.`);

        const timer = setTimeout(() => {
            this.turnTimers.delete(gameId);
            this.endTurn(gameId); // if the player does not play within 30 seconds, move to the next turn
        }, TURN_TIME_MS);

        this.turnTimers.set(gameId, timer);
        if (player.virtualPlayerProfile && this.virtualPlayerTurnHandler) {
            await this.virtualPlayerTurnHandler(player, activeGame);
        }
    }

    // end the turn and move to the next player
    async endTurn(gameId: string) {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) return;

        // Always clear timers, even if the game is already finished
        this.clearTimerFromMap(activeGame, this.turnTimers);
        this.clearTimerFromMap(activeGame, this.combatTimers);

        if (this.turnEndedHandler) {
            await this.turnEndedHandler(gameId);
        }

        if (activeGame.isFinished) {
            return;
        }

        const endingPlayerName = activeGame.turnOrder[activeGame.currentPlayerIndex];
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

        if (endingPlayerName) {
            this.sanctuaryService.onTurnEnded(activeGame, endingPlayerName);
        }

        if (nextPlayer) {
            nextPlayer.movementLeft = nextPlayer.rapidityPoints;
            nextPlayer.actionsLeft = MAX_PLAYER_ACTIONS;
        }

        await this.activeGameService.saveActiveGameById(gameId, activeGame);

        this.socketService.getNamespace(Namespaces.Game).to(gameId).emit(SocketEvent.PlayersUpdated, activeGame.players);

        this.startTurn(gameId);
    }

    async suspendTurn(gameId: string): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame || !activeGame.currentAttack) return;

        const secondsRemaining = this.clearTimerFromMap(activeGame, this.turnTimers);
        activeGame.currentAttack.suspendedTurnTimer = secondsRemaining;

        await this.activeGameService.saveActiveGameById(gameId, activeGame);
    }

    async continueTurn(gameId: string, timeLeft: number): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) return;

        const namespace = this.socketService.getNamespace(Namespaces.Game);
        namespace.to(gameId).emit(SocketEvent.TurnStarted, {
            player: this.getCurrentPlayer(activeGame)?.name,
            movementLeft: this.getCurrentPlayer(activeGame)?.movementLeft ?? 0,
            actionLeft: this.getCurrentPlayer(activeGame)?.actionsLeft ?? 0,
            timeLeft,
        });

        const stringGameId = activeGame._id.toString();
        const timer = setTimeout(() => {
            this.turnTimers.delete(stringGameId);
            this.endTurn(stringGameId);
        }, timeLeft);
        this.turnTimers.set(stringGameId, timer);
    }

    private getCurrentPlayer(activeGame: IActiveGame): ICharacter | undefined {
        const playerName = activeGame.turnOrder[activeGame.currentPlayerIndex];
        if (!playerName) {
            return undefined;
        }

        return activeGame.players.find((player) => player.name === playerName);
    }

    startCombatTimer(durationMs: number, activeGame: IActiveGame, callback: () => void): void {
        this.clearTimerFromMap(activeGame, this.combatTimers);

        const timer = setTimeout(() => {
            this.combatTimers.delete(activeGame._id);
            callback();
        }, durationMs);

        this.combatTimers.set(activeGame._id.toString(), timer);
    }

    clearCombatTimer(activeGame: IActiveGame): void {
        this.clearTimerFromMap(activeGame, this.combatTimers);
    }

    private clearTimerFromMap(activeGame: IActiveGame, map: Map<string, NodeJS.Timeout>): number {
        const stringGameId = activeGame._id.toString();

        const timer = map.get(stringGameId);
        if (!timer) {
            return 0;
        }

        const secondsRemaining = TURN_TIME_MS - (Date.now() - activeGame.turnStartTimeStamp);

        clearTimeout(timer);
        map.delete(stringGameId);
        return secondsRemaining;
    }
}
