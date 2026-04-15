import { ActiveGameListSocketsService } from '@app/services/active-game/active-game-list-sockets.service';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { CombatService } from '@app/services/gameplay/combat-service';
import { EndGameService } from '@app/services/gameplay/end-game.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { IActiveGame, IPlayerAbandonedGame } from '@common/active-game';
import { CombatOutcome } from '@common/attack-result';
import { SocketEvent } from '@common/socket-events';
import {
    IAbandonData,
    IDebugToggleState,
    IGameCanceledPayload,
    IGameEndedPayload,
    IJoinGamePayload,
    IPlayerIdPayload,
    ISocketData,
} from '@common/socket-payloads';
import { Namespace, Socket } from 'socket.io';
import { Container, Service } from 'typedi';
import { GameplayActionService } from './gameplay-action.service';
import { toGameCanceledReason } from '@app/utils/game-cancellation';

@Service()
export class GameSessionService {
    constructor(
        private readonly activeGameService: ActiveGameService,
        private readonly combatService: CombatService,
        private readonly endGameService: EndGameService,
        private readonly turnService: TurnService,
        private readonly activeGameListSocketService: ActiveGameListSocketsService,
    ) {}

    parseJoinGamePayload(payload: string | IJoinGamePayload): IJoinGamePayload {
        if (typeof payload === 'string') {
            return { activeGameId: payload };
        }
        return {
            activeGameId: payload?.activeGameId ?? '',
            playerName: payload?.playerName,
        };
    }

    setSocketPlayerName(socket: Socket, gameId: string, playerName: string): void {
        const data = socket.data as ISocketData;
        if (!data.playerNamesByGameId) {
            data.playerNamesByGameId = {};
        }
        data.playerNamesByGameId[gameId] = playerName;
    }

    unregisterSocketFromGame(socket: Socket, gameId: string): void {
        socket.leave(gameId);
        this.clearSocketPlayerName(socket, gameId);
    }

    leaveOtherGameRooms(socket: Socket, targetGameId: string): void {
        for (const roomId of socket.rooms) {
            if (roomId === socket.id || roomId === targetGameId) {
                continue;
            }
            this.unregisterSocketFromGame(socket, roomId);
        }
    }

    async handleWaitingRoomDisconnect(gameId: string, playerId: string, namespace: Namespace): Promise<void> {
        const isOrganizer = await this.endGameService.checkIfOrganizer(gameId, playerId);
        if (isOrganizer) {
            const gameCanceledPayload: IGameCanceledPayload = { playerId, reason: 'organizer-left-waiting-room' };
            namespace.to(gameId).emit(SocketEvent.GameCanceled, gameCanceledPayload);
            await this.activeGameService.deleteGameById(gameId);
        } else {
            await this.activeGameService.removePlayer(gameId, playerId);
            const leftWaitingRoomPayload: IPlayerIdPayload = { playerId };
            namespace.to(gameId).emit(SocketEvent.LeftWaitingRoom, leftWaitingRoomPayload);
        }
        this.activeGameListSocketService.emitJoinableGamesUpdated(gameId);
    }

    async handleActiveGameDisconnect(
        gameId: string,
        playerId: string,
        namespace: Namespace,
        emitGameLog: (gameId: string, message: string) => void,
    ): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) {
            return;
        }

        const player = activeGame.players.find((p) => p.name === playerId);
        if (!player) {
            return;
        }

        const currentAttack = activeGame.currentAttack;
        const combatAttackerName = currentAttack?.attacker;
        const combatOutcome = await this.resolveCombatIfNeeded(activeGame, playerId, gameId, namespace);

        await this.endGameService.handlePlayerAbandon(playerId, gameId);
        emitGameLog(gameId, `Abandon de partie: ${playerId}.`);

        const refreshedGame = await this.activeGameService.getActiveGameById(gameId);
        namespace.to(gameId).emit(SocketEvent.PlayersUpdated, refreshedGame.players);

        const playerAbandonedData: IPlayerAbandonedGame = {
            playerName: playerId,
            activeGame: refreshedGame,
        };
        namespace.to(gameId).emit(SocketEvent.PlayerAbandoned, playerAbandonedData);

        await this.disableDebugModeIfOrganizerLeft(gameId, playerId, refreshedGame, namespace, emitGameLog);

        const isCurrentPlayer = refreshedGame.turnOrder[refreshedGame.currentPlayerIndex] === playerId;
        const endGameResult = await this.endGameService.checkEndGame(gameId);
        this.emitEndGameTransitionIfNeeded(gameId, namespace, endGameResult, emitGameLog);
        await this.checkSurvivingAttackerEndTurn(gameId, refreshedGame, combatOutcome, combatAttackerName);
        if (isCurrentPlayer) {
            await this.turnService.endTurn(gameId);
        }
    }

    async handlePlayerKick(data: IAbandonData, namespace: Namespace): Promise<void> {
        const { gameId, playerId } = data;
        await this.activeGameService.removePlayer(gameId, playerId);
        const playerKickedPayload: IPlayerIdPayload = { playerId };
        namespace.to(gameId).emit(SocketEvent.PlayerKicked, playerKickedPayload);
        this.activeGameListSocketService.emitJoinableGamesUpdated(gameId);
    }

    async handleLeaveWaitingRoom(data: IAbandonData, namespace: Namespace, socket: Socket): Promise<void> {
        const { gameId, playerId } = data;
        const isOrganizer = await this.endGameService.checkIfOrganizer(gameId, playerId);
        if (isOrganizer) {
            const gameCanceledPayload: IGameCanceledPayload = { playerId, reason: 'organizer-left-waiting-room' };
            socket.to(gameId).emit(SocketEvent.GameCanceled, gameCanceledPayload);
            await this.activeGameService.deleteGameById(gameId);
        } else {
            await this.activeGameService.removePlayer(gameId, playerId);
            const leftWaitingRoomPayload: IPlayerIdPayload = { playerId };
            namespace.to(gameId).emit(SocketEvent.LeftWaitingRoom, leftWaitingRoomPayload);
        }
        this.activeGameListSocketService.emitJoinableGamesUpdated(gameId);
        this.unregisterSocketFromGame(socket, gameId);
    }

    async handlePlayerAbandon(
        data: IAbandonData,
        namespace: Namespace,
        socket: Socket,
        emitGameLog: (gameId: string, message: string) => void,
    ): Promise<void> {
        const { gameId, playerId } = data;
        await this.handleActiveGameDisconnect(gameId, playerId, namespace, emitGameLog);
        this.unregisterSocketFromGame(socket, gameId);
    }

    async handleDisconnect(socket: Socket, namespace: Namespace, emitGameLog: (gameId: string, message: string) => void): Promise<void> {
        const data = socket.data as ISocketData;
        const playerNamesByGameId = data.playerNamesByGameId;
        if (!playerNamesByGameId) return;

        for (const [gameId, playerId] of Object.entries(playerNamesByGameId)) {
            const updatedGame = await this.activeGameService.getActiveGameById(gameId);
            if (!updatedGame) continue;

            const gameHasStarted = updatedGame.turnOrder.length > 0;
            if (gameHasStarted) {
                await this.handleActiveGameDisconnect(gameId, playerId, namespace, emitGameLog);
            } else {
                await this.handleWaitingRoomDisconnect(gameId, playerId, namespace);
            }
        }
    }

    private clearSocketPlayerName(socket: Socket, gameId: string): void {
        const data = socket.data as ISocketData;
        if (!data.playerNamesByGameId) {
            return;
        }

        delete data.playerNamesByGameId[gameId];
        if (Object.keys(data.playerNamesByGameId).length === 0) {
            delete data.playerNamesByGameId;
        }
    }

    private getGameplayActionService(): GameplayActionService {
        return Container.get(GameplayActionService);
    }

    private async resolveCombatIfNeeded(
        activeGame: IActiveGame,
        playerId: string,
        gameId: string,
        namespace: Namespace,
    ): Promise<CombatOutcome | null> {
        const currentAttack = activeGame.currentAttack;
        if (!currentAttack || (currentAttack.attacker !== playerId && currentAttack.defender !== playerId)) {
            return null;
        }

        const combatOutcome = await this.combatService.cancelCombat(activeGame, playerId);
        if (combatOutcome) {
            namespace.to(gameId).emit(SocketEvent.CombatResolved, combatOutcome);
        }
        return combatOutcome;
    }

    private emitEndGameTransitionIfNeeded(
        gameId: string,
        namespace: Namespace,
        endGameResult: Awaited<ReturnType<EndGameService['checkEndGame']>>,
        emitGameLog: (gameId: string, message: string) => void,
    ): void {
        if (!endGameResult.hasEnded) {
            return;
        }

        if (endGameResult.completionType === 'canceled') {
            const gameCanceledPayload: IGameCanceledPayload = { reason: toGameCanceledReason(endGameResult.reason) };
            namespace.to(gameId).emit(SocketEvent.GameCanceled, gameCanceledPayload);
        } else {
            const gameEndedPayload: IGameEndedPayload = { winner: endGameResult.winner };
            namespace.to(gameId).emit(SocketEvent.GameEnded, gameEndedPayload);
        }

        emitGameLog(gameId, this.endGameService.getEndGameLogMessage(endGameResult));
    }

    private async checkSurvivingAttackerEndTurn(
        gameId: string,
        refreshedGame: IActiveGame,
        combatOutcome: CombatOutcome | null,
        combatAttackerName?: string,
    ): Promise<void> {
        if (!combatOutcome || !combatAttackerName) {
            return;
        }

        const survivingAttacker = refreshedGame.players.find((currentPlayer) => currentPlayer.name === combatAttackerName);
        if (survivingAttacker && !survivingAttacker.hasAbandoned) {
            await this.getGameplayActionService().checkEndTurnIfNoMovesLeft(gameId, combatAttackerName);
        }
    }

    private async disableDebugModeIfOrganizerLeft(
        gameId: string,
        playerId: string,
        activeGame: IActiveGame,
        namespace: Namespace,
        emitGameLog: (gameId: string, message: string) => void,
    ): Promise<void> {
        const gameHasStarted = activeGame.turnOrder.length > 0;
        if (playerId !== activeGame.organizerName || !gameHasStarted || !activeGame.isDebugMode) {
            return;
        }

        activeGame.isDebugMode = false;
        await this.activeGameService.saveActiveGameById(gameId, activeGame);
        const payload: IDebugToggleState = { playerName: playerId, isDebugMode: false };
        namespace.to(gameId).emit(SocketEvent.DebugToggle, payload);
        emitGameLog(gameId, `Mode debug désactivé (organisateur ${playerId} absent).`);
    }
}
