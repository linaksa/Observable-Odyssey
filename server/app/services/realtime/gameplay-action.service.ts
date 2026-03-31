import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { GameplayServices } from '@app/services/gameplay/gameplay-dependencies.service';
import { CellType } from '@common/board';
import { TEMPS_COMBAT } from '@common/constants';
import { ItemType } from '@common/items';
import { PlayerMovedResult } from '@common/playerMovedResult';
import { SocketEvent } from '@common/socket-events';
import {
    IAttackData,
    IAttackPostureData,
    IDoorToggleData,
    IDoorToggledResult,
    IGameLogPayload,
    IPlayerMoveData,
    ISanctuaryInteractedResult,
    ISanctuaryInteractionData,
} from '@common/socket-payloads';
import { Namespace, Socket } from 'socket.io';
import { Service } from 'typedi';

@Service()
export class GameplayActionService {
    constructor(
        private readonly gameplayService: GameplayServices,
        private readonly activeGameService: ActiveGameService,
    ) {}

    async handlePlayerMove(data: IPlayerMoveData, socket: Socket, namespace: Namespace): Promise<void> {
        const { gameId, playerId, direction } = data;
        try {
            const { newPosition, movementLeft } = await this.gameplayService.movementService.movePlayer(playerId, gameId, direction);
            namespace.to(gameId).emit(SocketEvent.PlayerMoved, { playerId, newPosition, movementLeft } as PlayerMovedResult);

            await this.checkEndTurnIfNoMovesLeft(gameId, playerId);
        } catch (error) {
            socket.emit(SocketEvent.PlayerMoveError, { message: (error as Error).message ?? 'Déplacement non autorisé' });
        }
    }

    async handleToggleDoor(
        data: IDoorToggleData,
        socket: Socket,
        namespace: Namespace,
        emitGameLog: (gameId: string, message: string) => void,
    ): Promise<void> {
        const { gameId, playerId, position } = data;
        try {
            const result: IDoorToggledResult = await this.gameplayService.doorService.toggleDoor(playerId, gameId, position);
            namespace.to(gameId).emit(SocketEvent.DoorToggled, result);
            emitGameLog(gameId, `${playerId} a ${result.cellType === CellType.OpenDoor ? 'ouvert' : 'fermé'} une porte.`);

            await this.checkEndTurnIfNoMovesLeft(gameId, playerId);
        } catch (error) {
            socket.emit(SocketEvent.DoorToggleError, { message: (error as Error).message ?? 'Action sur la porte non autorisée' });
        }
    }

    async handleSanctuaryInteraction(
        data: ISanctuaryInteractionData,
        socket: Socket,
        namespace: Namespace,
        emitGameLog: (gameId: string, message: string) => void,
    ): Promise<void> {
        const { gameId, playerId, position, choice } = data;
        try {
            const result: ISanctuaryInteractedResult = await this.gameplayService.sanctuaryService.interactSanctuary(playerId, gameId, {
                position,
                choice,
            });
            namespace.to(gameId).emit(SocketEvent.SanctuaryInteracted, result);
            const sanctuaryKind = result.itemType === ItemType.LifeSanctuary ? 'vie' : 'combat';
            emitGameLog(gameId, `${playerId} a utilisé un sanctuaire de ${sanctuaryKind}.`);

            await this.checkEndTurnIfNoMovesLeft(gameId, playerId);
        } catch (error) {
            socket.emit(SocketEvent.SanctuaryInteractionError, {
                message: (error as Error).message ?? 'Interaction avec le sanctuaire non autorisée',
            });
        }
    }

    async handleAttack(
        data: IAttackData,
        socket: Socket,
        namespace: Namespace,
        emitGameLog: (gameId: string, message: string) => void,
    ): Promise<void> {
        const { gameId, attackerName, defenderName } = data;
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) {
            socket.emit(SocketEvent.AttackError, { message: 'Partie introuvable' });
            return;
        }

        const allowed = await this.gameplayService.combatService.canAttack(gameId, attackerName, defenderName);
        if (!allowed) {
            socket.emit(SocketEvent.AttackError, { message: 'Attaque non autorisée' });
            return;
        }

        const result = await this.activeGameService.startCombat(gameId, attackerName, defenderName);
        this.gameplayService.turnService.suspendTurn(gameId);

        emitGameLog(gameId, `Debut du combat entre ${attackerName} et ${defenderName}.`);

        this.gameplayService.turnService.startCombatTimer(TEMPS_COMBAT, activeGame, async () => {
            const combatResolved = await this.gameplayService.combatService.applyCombatTurn(gameId);
            if (combatResolved) {
                await this.handleTurnAndGameEndCase(attackerName, gameId, namespace);
            }
        });

        namespace.to(gameId).emit(SocketEvent.CombatStarted, result);
        namespace.to(gameId).emit(SocketEvent.CombatTurnStart, result);
    }

    async handleChooseAttackPosture(data: IAttackPostureData, namespace: Namespace): Promise<void> {
        const { gameId, playerName, posture } = data;
        const updatedActiveGame = await this.activeGameService.choosePosture(gameId, playerName, posture);

        const combatReady = updatedActiveGame.currentAttack?.attackerPosture && updatedActiveGame.currentAttack?.defenderPosture;
        if (!combatReady) {
            namespace.to(gameId).emit(SocketEvent.AttackPostureChosen, data);
            return;
        }

        this.gameplayService.turnService.clearCombatTimer(updatedActiveGame);

        const combatResolved = await this.gameplayService.combatService.applyCombatTurn(gameId);

        const currentPlayerName = updatedActiveGame.turnOrder[updatedActiveGame.currentPlayerIndex];
        if (combatResolved && currentPlayerName) {
            await this.handleTurnAndGameEndCase(currentPlayerName, gameId, namespace);
        }
    }

    async handleStartGame(activeGameId: string, socket: Socket, namespace: Namespace): Promise<boolean> {
        if (!activeGameId) {
            return false;
        }

        const activeGame = await this.activeGameService.getActiveGameById(activeGameId);

        if (!socket.rooms.has(activeGameId)) {
            return false;
        }

        if (activeGame.players.length < 2) {
            socket.emit(SocketEvent.StartGameError, {
                message: 'Il faut au moins 2 joueurs pour démarrer la partie.',
            });
            return false;
        }

        await this.gameplayService.startGameService.initializeGame(activeGameId);

        const updatedGame = await this.activeGameService.getActiveGameById(activeGameId);
        namespace.to(activeGameId).emit(SocketEvent.PlayersUpdated, updatedGame.players);
        namespace.to(activeGameId).emit(SocketEvent.GameStarted, activeGameId);

        this.gameplayService.turnService.startTurn(activeGameId);
        return true;
    }

    emitGameLogToRoom(gameId: string, message: string, namespace?: Namespace): void {
        if (!namespace || !gameId || !message.trim()) {
            return;
        }

        namespace.to(gameId).emit(SocketEvent.GameLog, this.createGameLogPayload(message));
    }

    private createGameLogPayload(message: string): IGameLogPayload {
        return {
            message,
            postedAt: new Date().toISOString(),
        };
    }

    private async checkEndTurnIfNoMovesLeft(gameId: string, playerId: string): Promise<void> {
        const reachable = await this.gameplayService.movementService.getReachablePositions(playerId, gameId);
        const canAttackAnyPlayer = await this.gameplayService.combatService.canAttackAnyPlayer(gameId, playerId);
        if (reachable.length === 0 && !canAttackAnyPlayer) {
            await this.gameplayService.turnService.endTurn(gameId);
        }
    }

    private async handleTurnAndGameEndCase(attackerName: string, gameId: string, namespace: Namespace): Promise<void> {
        const reachable = await this.gameplayService.movementService.getReachablePositions(attackerName, gameId);
        if (reachable.length === 0) {
            await this.gameplayService.turnService.endTurn(gameId);
        }

        const gameEnded = await this.gameplayService.endGameService.checkEndGame(gameId);
        if (gameEnded) {
            namespace.to(gameId).emit(SocketEvent.GameEnded, { winner: attackerName });
            await this.activeGameService.deleteGameById(gameId);
        }
    }
}
