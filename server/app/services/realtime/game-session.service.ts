import { ActiveGameListSocketsService } from '@app/services/active-game/active-game-list-sockets.service';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { CombatService } from '@app/services/gameplay/combat-service';
import { EndGameService } from '@app/services/gameplay/end-game.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { IActiveGame, IPlayerAbandonnedGame } from '@common/activeGame';
import { SocketEvent } from '@common/socket-events';
import { IAbandonData, IDebugToggleState, IJoinGamePayload, ISocketData } from '@common/socket-payloads';
import { Namespace, Socket } from 'socket.io';
import { Service } from 'typedi';
import { GameplayActionService } from './gameplay-action.service';

@Service()
export class GameSessionService {
    constructor(
        private readonly activeGameService: ActiveGameService,
        private readonly combatService: CombatService,
        private readonly endGameService: EndGameService,
        private readonly turnService: TurnService,
        private readonly activeGameListSocketService: ActiveGameListSocketsService,
        private readonly gameplayActionService: GameplayActionService,
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
            namespace.to(gameId).emit(SocketEvent.GameCanceled, { playerId });
            await this.activeGameService.deleteGameById(gameId);
        } else {
            await this.activeGameService.removePlayer(gameId, playerId);
            namespace.to(gameId).emit(SocketEvent.LeftWaitingRoom, { playerId });
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
        const currentAttack = activeGame.currentAttack;
        if (currentAttack && (currentAttack.attacker === playerId || currentAttack.defender === playerId)) {
            const combatOutcome = await this.combatService.cancelCombat(activeGame, playerId);
            if (combatOutcome) {
                this.gameplayActionService.checkEndTurnIfNoMovesLeft(gameId, currentAttack.attacker);
                namespace.to(gameId).emit(SocketEvent.CombatResolved, combatOutcome);
            }
        }

        await this.endGameService.handlePlayerAbandon(playerId, gameId);
        emitGameLog(gameId, `Abandon de partie: ${playerId}.`);

        const refreshedGame = await this.activeGameService.getActiveGameById(gameId);
        namespace.to(gameId).emit(SocketEvent.PlayersUpdated, refreshedGame.players);

        const playerAbandonnedData: IPlayerAbandonnedGame = {
            playerName: playerId,
            activeGame: refreshedGame,
        };
        namespace.to(gameId).emit(SocketEvent.PlayerAbandoned, playerAbandonnedData);

        await this.disableDebugModeIfOrganizerLeft(gameId, playerId, refreshedGame, namespace, emitGameLog);

        const isCurrentPlayer = refreshedGame.turnOrder[refreshedGame.currentPlayerIndex] === playerId;
        const gameEnded = await this.endGameService.checkEndGame(gameId);
        if (gameEnded) {
            namespace.to(gameId).emit(SocketEvent.GameEnded, { winner: null });
            emitGameLog(gameId, 'Fin de partie: il ne reste pas assez de joueurs.');
            // await this.activeGameService.deleteGameById(gameId);
        }
        if (isCurrentPlayer) {
            await this.turnService.endTurn(gameId);
        }
    }

    async handlePlayerKick(data: IAbandonData, namespace: Namespace): Promise<void> {
        const { gameId, playerId } = data;
        await this.activeGameService.removePlayer(gameId, playerId);
        namespace.to(gameId).emit(SocketEvent.PlayerKicked, { playerId });
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
            namespace.to(gameId).emit(SocketEvent.LeftWaitingRoom, { playerId });
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
        await this.endGameService.handlePlayerAbandon(playerId, gameId);
        emitGameLog(gameId, `Abandon de partie: ${playerId}.`);

        const updatedGame = await this.activeGameService.getActiveGameById(gameId);
        await this.disableDebugModeIfOrganizerLeft(gameId, playerId, updatedGame, namespace, emitGameLog);

        const playerAbandonned: IPlayerAbandonnedGame = {
            playerName: playerId,
            activeGame: updatedGame,
        };

        namespace.to(gameId).emit(SocketEvent.PlayerAbandoned, playerAbandonned);
        const gameEnded = await this.endGameService.checkEndGame(gameId);
        if (gameEnded) {
            namespace.to(gameId).emit(SocketEvent.GameEnded, { winner: null });
            emitGameLog(gameId, 'Fin de partie: il ne reste pas assez de joueurs.');
            // await this.activeGameService.deleteGameById(gameId);
        }

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
            if (!gameHasStarted) {
                await this.handleWaitingRoomDisconnect(gameId, playerId, namespace);
            } else {
                await this.handleActiveGameDisconnect(gameId, playerId, namespace, emitGameLog);
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
        emitGameLog(gameId, `Mode debug desactive (organisateur ${playerId} absent).`);
    }
}
