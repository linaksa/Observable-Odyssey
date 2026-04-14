import { ActiveGameListSocketsService } from '@app/services/active-game/active-game-list-sockets.service';
import { GameplayActionService } from '@app/services/realtime/gameplay-action.service';
import { SocketEvent } from '@common/socket-events';
import {
    IActionData,
    IAttackPostureData,
    IDoorToggleData,
    IFlagDecisionData,
    IFlagTransferRejectionData,
    IPlayerMoveData,
    ISanctuaryInteractionData,
} from '@common/socket-payloads';
import { Namespace, Socket } from 'socket.io';
import { Service } from 'typedi';

@Service()
export class GameSocketGameplayEventsService {
    constructor(
        private readonly gameplayActionService: GameplayActionService,
        private readonly activeGameListSocketService: ActiveGameListSocketsService,
    ) {}

    register(socket: Socket, namespace: Namespace): void {
        socket.on(SocketEvent.StartGame, async (activeGameId: string) => {
            const started = await this.gameplayActionService.handleStartGame(activeGameId, socket, namespace);
            if (started) {
                this.activeGameListSocketService.emitJoinableGamesUpdated(activeGameId);
            }
        });

        socket.on(SocketEvent.PlayerMove, async (data: IPlayerMoveData) => {
            await this.gameplayActionService.handlePlayerMove(data, socket, namespace);
        });

        socket.on(SocketEvent.ToggleDoor, async (data: IDoorToggleData) => {
            await this.gameplayActionService.handleToggleDoor(data, socket, namespace, this.emitGameLog.bind(this, namespace));
        });

        socket.on(SocketEvent.InteractSanctuary, async (data: ISanctuaryInteractionData) => {
            await this.gameplayActionService.handleSanctuaryInteraction(data, socket, namespace, this.emitGameLog.bind(this, namespace));
        });

        socket.on(SocketEvent.Action, async (data: IActionData) => {
            await this.gameplayActionService.handleAction(data, socket, namespace);
        });

        socket.on(SocketEvent.ChooseAttackPosture, async (data: IAttackPostureData) => {
            await this.gameplayActionService.handleChooseAttackPosture(data, namespace);
        });

        socket.on(SocketEvent.EndTurn, (gameId: string) => {
            this.gameplayActionService.handleEndTurn(gameId);
        });

        socket.on(SocketEvent.FlagTaken, async (data: IFlagDecisionData) => {
            await this.gameplayActionService.handleFlagTaken(data, namespace);
        });

        socket.on(SocketEvent.FlagGiven, async (data: IFlagDecisionData) => {
            await this.gameplayActionService.handleFlagGiven(data, namespace);
        });

        socket.on(SocketEvent.RejectFlagTransfer, async (data: IFlagTransferRejectionData) => {
            await this.gameplayActionService.handleFlagTransferRejected(data, namespace);
        });
    }

    private emitGameLog(namespace: Namespace, gameId: string, message: string): void {
        this.gameplayActionService.emitGameLogToRoom(gameId, message, namespace);
    }
}
