import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { ActionService } from '@app/services/gameplay/action-service';
import { CtfFlagActionService, PendingFlagRequest } from '@app/services/realtime/ctf-flag-action.service';
import { GameplayTurnEndService } from '@app/services/realtime/gameplay-turn-end.service';
import { SocketEvent } from '@common/socket-events';
import { IActionData, IFlagDecisionData } from '@common/socket-payloads';
import { Namespace } from 'socket.io';
import { Service } from 'typedi';

type FlagTransferMode = 'take' | 'give';

@Service()
export class GameplayFlagDecisionService {
    private pendingFlagRequestsByGameId: Map<string, PendingFlagRequest> = new Map();

    constructor(
        private readonly activeGameService: ActiveGameService,
        private readonly actionService: ActionService,
        private readonly ctfFlagActionService: CtfFlagActionService,
        private readonly gameplayTurnEndService: GameplayTurnEndService,
    ) {}

    clearPendingRequest(gameId: string): void {
        this.pendingFlagRequestsByGameId.delete(gameId);
    }

    async handleFlagAction(data: IActionData, namespace: Namespace, emitGameLog: (gameId: string, message: string) => void): Promise<boolean> {
        const activeGame = await this.activeGameService.getActiveGameById(data.gameId);
        return await this.ctfFlagActionService.handleFlagAction(activeGame, data, namespace, {
            setPendingFlagRequest: (gameId, request) => {
                this.pendingFlagRequestsByGameId.set(gameId, request);
            },
            emitGameLog,
            onFlagUpdated: async (gameId) => {
                await this.gameplayTurnEndService.emitGameEndedIfNeeded(gameId, namespace);
            },
        });
    }

    async handleFlagTaken(data: IFlagDecisionData, namespace: Namespace, emitGameLog: (gameId: string, message: string) => void): Promise<void> {
        await this.handleFlagTransfer(data, namespace, emitGameLog, 'take');
    }

    async handleFlagGiven(data: IFlagDecisionData, namespace: Namespace, emitGameLog: (gameId: string, message: string) => void): Promise<void> {
        await this.handleFlagTransfer(data, namespace, emitGameLog, 'give');
    }

    private async handleFlagTransfer(
        data: IFlagDecisionData,
        namespace: Namespace,
        emitGameLog: (gameId: string, message: string) => void,
        transferMode: FlagTransferMode,
    ): Promise<void> {
        const { gameId, newFlagCarrierName } = data;
        const pendingRequest = this.pendingFlagRequestsByGameId.get(gameId);
        if (!pendingRequest) {
            return;
        }

        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const currentTurnPlayerName = activeGame.turnOrder[activeGame.currentPlayerIndex];
        const isRequesterTurn = currentTurnPlayerName === pendingRequest.requesterName;
        const expectedCarrierName = transferMode === 'take' ? pendingRequest.requesterName : pendingRequest.targetPlayerName;

        if (!isRequesterTurn || newFlagCarrierName !== expectedCarrierName) {
            this.pendingFlagRequestsByGameId.delete(gameId);
            return;
        }

        const previousCarrierName = activeGame.hasFlagId;
        if (transferMode === 'take') {
            await this.actionService.takeFlag(gameId, newFlagCarrierName);
        } else {
            await this.actionService.giveFlag(gameId, newFlagCarrierName);
        }

        const requester = activeGame.players.find((player) => player.name === pendingRequest.requesterName);
        namespace.to(gameId).emit(SocketEvent.FlagPickedUp, {
            playerName: newFlagCarrierName,
            requesterName: pendingRequest.requesterName,
            requesterActionsLeft: requester?.actionsLeft,
        });
        if (previousCarrierName && previousCarrierName !== newFlagCarrierName) {
            emitGameLog(gameId, `Transfert du drapeau de ${previousCarrierName} à ${newFlagCarrierName}.`);
        }
        await this.gameplayTurnEndService.emitGameEndedIfNeeded(gameId, namespace);
        this.pendingFlagRequestsByGameId.delete(gameId);
    }
}
