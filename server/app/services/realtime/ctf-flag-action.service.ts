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

    // eslint-disable-next-line max-params
    async handleFlagAction(
        activeGame: IActiveGame,
        data: IActionData,
        namespace: Namespace,
        setPendingFlagRequest: (gameId: string, request: PendingFlagRequest) => void,
        emitGameLog?: (gameId: string, message: string) => void,
        onFlagUpdated?: (gameId: string) => Promise<void>,
    ): Promise<boolean> {
        const { emitGameLog: resolvedEmitGameLog, onFlagUpdated: resolvedOnFlagUpdated } = this.resolveCallbacks(emitGameLog, onFlagUpdated);
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
                resolvedEmitGameLog?.(gameId, `Transfert du drapeau de ${currentPlayerName} à ${targetName}.`);
                await resolvedOnFlagUpdated?.(gameId);
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
                resolvedEmitGameLog?.(gameId, `Transfert du drapeau de ${targetName} à ${currentPlayerName}.`);
                await resolvedOnFlagUpdated?.(gameId);
                return true;
            }

            setPendingFlagRequest(gameId, { requesterName: currentPlayerName, targetPlayerName: targetName });
            namespace.to(gameId).emit(SocketEvent.TakeFlag, flagActionData);
            return true;
        }

        return true;
    }

    private resolveCallbacks(
        emitGameLog?: (gameId: string, message: string) => void,
        onFlagUpdated?: (gameId: string) => Promise<void>,
    ): {
        emitGameLog?: (gameId: string, message: string) => void;
        onFlagUpdated?: (gameId: string) => Promise<void>;
    } {
        if (onFlagUpdated) {
            return { emitGameLog, onFlagUpdated };
        }

        if (emitGameLog?.length === 0 || emitGameLog?.length === 1) {
            return {
                onFlagUpdated: emitGameLog as unknown as (gameId: string) => Promise<void>,
            };
        }

        return { emitGameLog };
    }
}
