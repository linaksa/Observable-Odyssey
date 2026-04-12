import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { StartGameService } from '@app/services/gameplay/start-game.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { GameSessionService } from '@app/services/realtime/game-session.service';
import { GameplayRealtimeFlowService } from '@app/services/realtime/gameplay-realtime-flow.service';
import { ErrorCode } from '@common/error-codes';
import {
    IAbandonData,
    IActionData,
    IAttackPostureData,
    IDoorToggleData,
    IFlagDecisionData,
    IPlayerMoveData,
    ISanctuaryInteractionData,
} from '@common/socket-payloads';
import { SocketEvent } from '@common/socket-events';
import { Namespace, Socket } from 'socket.io';
import { Service } from 'typedi';

@Service()
export class GameplayActionService {
    constructor(
        private readonly turnService: TurnService,
        private readonly startGameService: StartGameService,
        private readonly activeGameService: ActiveGameService,
        private readonly gameSessionService: GameSessionService,
        private readonly gameplayRealtimeFlowService: GameplayRealtimeFlowService,
    ) {}

    async handleEndTurn(gameId: string): Promise<void> {
        this.gameplayRealtimeFlowService.clearPendingFlagRequest(gameId);
        await this.turnService.endTurn(gameId);
        this.gameplayRealtimeFlowService.clearPendingFlagRequest(gameId);
    }

    async handlePlayerAbandon(data: IAbandonData, namespace: Namespace, socket: Socket): Promise<void> {
        await this.gameSessionService.handlePlayerAbandon(data, namespace, socket, this.emitGameLogToRoom.bind(this));
        const activeGame = await this.activeGameService.getActiveGameById(data.gameId);
        if (!activeGame) {
            return;
        }
        const gameEnded = await this.gameplayRealtimeFlowService.emitGameEndedIfNeeded(data.gameId, namespace);
        if (gameEnded) {
            this.gameplayRealtimeFlowService.clearPendingFlagRequest(data.gameId);
        }
    }

    async handlePlayerMove(data: IPlayerMoveData, socket: Socket, namespace: Namespace): Promise<void> {
        await this.gameplayRealtimeFlowService.handlePlayerMove(data, socket, namespace);
    }

    async handleToggleDoor(
        data: IDoorToggleData,
        socket: Socket | null,
        namespace: Namespace,
        emitGameLog: (gameId: string, message: string) => void,
    ): Promise<void> {
        await this.gameplayRealtimeFlowService.handleToggleDoor(data, socket, namespace, emitGameLog);
    }

    async handleSanctuaryInteraction(
        data: ISanctuaryInteractionData,
        socket: Socket | null,
        namespace: Namespace,
        emitGameLog: (gameId: string, message: string) => void,
    ): Promise<void> {
        await this.gameplayRealtimeFlowService.handleSanctuaryInteraction(data, socket, namespace, emitGameLog);
    }

    async combatManager(gameId: string, attackerName: string, defenderName: string, socket: Socket | null, namespace: Namespace): Promise<void> {
        await this.gameplayRealtimeFlowService.combatManager(gameId, attackerName, defenderName, socket, {
            namespace,
            emitGameLog: (targetGameId, message) => this.emitGameLogToRoom(targetGameId, message, namespace),
        });
    }

    async handleAction(data: IActionData, socket: Socket, namespace: Namespace): Promise<void> {
        const { gameId, currentPlayerName, targetName } = data;
        const allowed = await this.gameplayRealtimeFlowService.canUseAction(gameId, currentPlayerName, targetName);

        if (!allowed) {
            socket.emit(SocketEvent.ActionError, { errorCodes: [ErrorCode.ActionNotAllowed] });
            return;
        }

        const handledAsFlagAction = await this.gameplayRealtimeFlowService.handleFlagAction(data, namespace, (targetGameId, message) =>
            this.emitGameLogToRoom(targetGameId, message, namespace),
        );
        if (handledAsFlagAction) {
            return;
        }
        await this.combatManager(gameId, currentPlayerName, targetName, socket, namespace);
    }

    async handleFlagTaken(data: IFlagDecisionData, namespace: Namespace): Promise<void> {
        await this.gameplayRealtimeFlowService.handleFlagTaken(data, namespace, (targetGameId, message) =>
            this.emitGameLogToRoom(targetGameId, message, namespace),
        );
    }

    async handleFlagGiven(data: IFlagDecisionData, namespace: Namespace): Promise<void> {
        await this.gameplayRealtimeFlowService.handleFlagGiven(data, namespace, (targetGameId, message) =>
            this.emitGameLogToRoom(targetGameId, message, namespace),
        );
    }

    async handleChooseAttackPosture(data: IAttackPostureData, namespace: Namespace): Promise<void> {
        await this.gameplayRealtimeFlowService.handleChooseAttackPosture(data, namespace);
    }

    async handleStartGame(activeGameId: string, socket: Socket, namespace: Namespace): Promise<boolean> {
        if (!activeGameId) {
            return false;
        }

        const activeGame = await this.activeGameService.getActiveGameById(activeGameId);
        if (!socket.rooms.has(activeGameId)) {
            return false;
        }
        if (activeGame.game.gameMode === 'ctf' && activeGame.players.length % 2 !== 0) {
            socket.emit(SocketEvent.StartGameError, { errorCodes: [ErrorCode.CtfRequiresEvenPlayerCount] });
            return false;
        }
        if (activeGame.players.length < 2) {
            socket.emit(SocketEvent.StartGameError, { errorCodes: [ErrorCode.StartGameRequiresAtLeastTwoPlayers] });
            return false;
        }

        await this.startGameService.initializeGame(activeGameId);

        const updatedGame = await this.activeGameService.getActiveGameById(activeGameId);
        namespace.to(activeGameId).emit(SocketEvent.PlayersUpdated, updatedGame.players);
        namespace.to(activeGameId).emit(SocketEvent.GameStarted, activeGameId);

        this.turnService.startTurn(activeGameId);
        return true;
    }

    emitGameLogToRoom(gameId: string, message: string, namespace?: Namespace): void {
        this.gameplayRealtimeFlowService.emitGameLogToRoom(gameId, message, namespace);
    }

    async checkEndTurnIfNoMovesLeft(gameId: string, playerId: string): Promise<void> {
        await this.gameplayRealtimeFlowService.checkEndTurnIfNoMovesLeft(gameId, playerId);
    }
}
