import { ActionService } from '@app/services/gameplay/action-service';
import { IActiveGame } from '@common/activeGame';
import { SocketEvent } from '@common/socket-events';
import { IActionData } from '@common/socket-payloads';
import { Namespace } from 'socket.io';
import { Service } from 'typedi';

export interface PendingFlagRequest {
    requesterName: string;
    targetPlayerName: string;
}

@Service()
export class CtfFlagActionService {
    constructor(private readonly actionService: ActionService) {}

    async handleFlagAction(
        activeGame: IActiveGame,
        data: IActionData,
        namespace: Namespace,
        setPendingFlagRequest: (gameId: string, request: PendingFlagRequest) => void,
        emitGameLog?: (gameId: string, message: string) => void,
        onFlagUpdated?: (gameId: string) => Promise<void>,
    ): Promise<boolean> {
        const { gameId, currentPlayerName, targetName } = data;
        if (activeGame.game.gameMode !== 'ctf') {
            return false;
        }
        if (!(await this.actionService.isOnSameTeam(currentPlayerName, targetName, gameId))) {
            return false;
        }

        const currentIsVirtual = activeGame.players.some((player) => player.name === currentPlayerName && !!player.virtualPlayerProfile);
        const targetIsVirtual = activeGame.players.some((player) => player.name === targetName && !!player.virtualPlayerProfile);
        const canGiveFlag = await this.actionService.canGiveFlag(currentPlayerName, gameId);
        if (canGiveFlag) {
            if (currentIsVirtual) {
                return true;
            }
            const flagActionData = await this.actionService.flagActionRequest(currentPlayerName, targetName, gameId);
            if (targetIsVirtual) {
                await this.actionService.giveFlag(gameId, targetName);
                namespace.to(gameId).emit(SocketEvent.FlagPickedUp, { playerName: targetName });
                emitGameLog?.(gameId, `Transfert du drapeau de ${currentPlayerName} à ${targetName}.`);
                await onFlagUpdated?.(gameId);
                return true;
            }

            setPendingFlagRequest(gameId, { requesterName: currentPlayerName, targetPlayerName: targetName });
            namespace.to(gameId).emit(SocketEvent.GiveFlag, flagActionData);
            return true;
        }

        const canTakeFlag = await this.actionService.canTakeFlag(targetName, gameId);
        if (canTakeFlag) {
            const flagActionData = await this.actionService.flagActionRequest(currentPlayerName, targetName, gameId);
            if (targetIsVirtual) {
                await this.actionService.takeFlag(gameId, currentPlayerName);
                namespace.to(gameId).emit(SocketEvent.FlagPickedUp, { playerName: currentPlayerName });
                emitGameLog?.(gameId, `Transfert du drapeau de ${targetName} à ${currentPlayerName}.`);
                await onFlagUpdated?.(gameId);
                return true;
            }

            setPendingFlagRequest(gameId, { requesterName: currentPlayerName, targetPlayerName: targetName });
            namespace.to(gameId).emit(SocketEvent.TakeFlag, flagActionData);
            return true;
        }

        return true;
    }
}
