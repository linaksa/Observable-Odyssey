import { ActiveGameListSocketsService } from '@app/services/active-game/active-game-list-sockets.service';
import { ActiveGameGarbageCollectorService } from '@app/services/active-game/active-game-garbage-collector.service';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { CombatService } from '@app/services/gameplay/combat-service';
import { EndGameService } from '@app/services/gameplay/end-game.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { IActiveGame, IPlayerAbandonedGame } from '@common/active-game';
import { CombatOutcome } from '@common/attack-result';
import { SocketEvent } from '@common/socket-events';
import { IAbandonData, IDebugToggleState, IGameEndedPayload, IJoinGamePayload, IPlayerIdPayload, ISocketData } from '@common/socket-payloads';
import { Namespace, Socket } from 'socket.io';
import { Container, Service } from 'typedi';
import { GameplayActionService } from './gameplay-action.service';

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
            const gameCanceledPayload: IPlayerIdPayload = { playerId };
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
        let combatOutcome: CombatOutcome | null = null;
        if (currentAttack && (currentAttack.attacker === playerId || currentAttack.defender === playerId)) {
            combatOutcome = await this.combatService.cancelCombat(activeGame, playerId);
            if (combatOutcome) {
                namespace.to(gameId).emit(SocketEvent.CombatResolved, combatOutcome);
            }
        }

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
        if (endGameResult.hasEnded) {
            const gameEndedPayload: IGameEndedPayload = { winner: endGameResult.winner };
            namespace.to(gameId).emit(SocketEvent.GameEnded, gameEndedPayload);
            emitGameLog(gameId, this.endGameService.getEndGameLogMessage(endGameResult));
            await this.getActiveGameGarbageCollectorService().reevaluateFinishedGameMark(gameId);
            // await this.activeGameService.deleteGameById(gameId);
        }
        if (combatOutcome && combatAttackerName) {
            const survivingAttacker = refreshedGame.players.find((currentPlayer) => currentPlayer.name === combatAttackerName);
            if (survivingAttacker && !survivingAttacker.hasAbandoned) {
                await this.getGameplayActionService().checkEndTurnIfNoMovesLeft(gameId, combatAttackerName);
            }
        }
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
            socket.to(gameId).emit(SocketEvent.GameCanceled);
            await this.activeGameService.deleteGameById(gameId);
        } else {
            await this.activeGameService.removePlayer(gameId, playerId);
            const leftWaitingRoomPayload: IPlayerIdPayload = { playerId };
            namespace.to(gameId).emit(SocketEvent.LeftWaitingRoom, leftWaitingRoomPayload);
        }
        this.activeGameListSocketService.emitJoinableGamesUpdated(gameId);
        this.unregisterSocketFromGame(socket, gameId);
        await this.getActiveGameGarbageCollectorService().reevaluateFinishedGameMark(gameId);
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
        await this.getActiveGameGarbageCollectorService().reevaluateFinishedGameMark(gameId);
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

            await this.getActiveGameGarbageCollectorService().reevaluateFinishedGameMark(gameId);
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

    private getActiveGameGarbageCollectorService(): ActiveGameGarbageCollectorService {
        return Container.get(ActiveGameGarbageCollectorService);
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
