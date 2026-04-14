import { AppError } from '@app/error-types/app-error';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { ActionService } from '@app/services/gameplay/action-service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { GameplayTurnEndService } from '@app/services/realtime/gameplay-turn-end.service';
import { VirtualPlayerTurnFinalizerService } from '@app/services/virtual-player/virtual-player-turn-finalizer.service';
import { AttackPosture } from '@common/attackResult';
import { COMBAT_TIME_MS } from '@common/constants';
import { ErrorCode } from '@common/error-codes';
import { SocketEvent } from '@common/socket-events';
import { IAttackPostureData } from '@common/socket-payloads';
import { Namespace, Socket } from 'socket.io';
import { Service } from 'typedi';

export interface ICombatFlowContext {
    namespace: Namespace;
    emitGameLog: (gameId: string, message: string) => void;
}

@Service()
export class GameplayCombatFlowService {
    constructor(
        private readonly actionService: ActionService,
        private readonly activeGameService: ActiveGameService,
        private readonly turnService: TurnService,
        private readonly gameplayTurnEndService: GameplayTurnEndService,
        private readonly virtualPlayerTurnFinalizerService: VirtualPlayerTurnFinalizerService,
    ) {}

    async combatManager(
        gameId: string,
        attackerName: string,
        defenderName: string,
        socket: Socket | null,
        context: ICombatFlowContext,
    ): Promise<void> {
        const allowed = await this.canUseAction(gameId, attackerName, defenderName);
        if (!allowed) {
            socket?.emit(SocketEvent.ActionError, { errorCodes: [ErrorCode.ActionNotAllowed] });
            return;
        }

        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const result = await this.activeGameService.startCombat(gameId, attackerName, defenderName);
        this.turnService.suspendTurn(gameId);

        context.emitGameLog(gameId, `Début du combat entre ${attackerName} et ${defenderName}.`);

        const processCombatTurn = async () => {
            try {
                const refreshedGame = await this.activeGameService.getActiveGameById(gameId);
                if (!refreshedGame || refreshedGame.isFinished || !refreshedGame.currentAttack) {
                    return;
                }

                const combatResolved = await this.actionService.applyCombatTurn(gameId);
                if (combatResolved) {
                    await this.handlePostCombatEndScenario(attackerName, gameId, context.namespace);
                }
            } catch (error) {
                if (this.isNoOngoingAttackError(error)) {
                    return;
                }

                throw error;
            }
        };

        this.turnService.startCombatTimer(COMBAT_TIME_MS, activeGame, processCombatTurn);

        context.namespace.to(gameId).emit(SocketEvent.CombatStarted, result);
        context.namespace.to(gameId).emit(SocketEvent.CombatTurnStart, result);

        await this.actionService.autoChooseVirtualPostures(gameId);
        if (await this.actionService.combatTurnCanBeApplied(gameId)) {
            this.turnService.clearCombatTimer(activeGame);
            await processCombatTurn();
        }
    }

    async canUseAction(gameId: string, attackerName: string, defenderName: string): Promise<boolean> {
        return await this.actionService.canUseAction(gameId, attackerName, defenderName);
    }

    async handleChooseAttackPosture(data: IAttackPostureData, namespace: Namespace): Promise<void> {
        const { gameId, playerName, posture } = data;
        const updatedActiveGame = await this.choosePosture(gameId, playerName, posture);
        if (!updatedActiveGame) {
            return;
        }

        await this.checkCombatReadyCondition(gameId, namespace);
    }

    private async checkCombatReadyCondition(activeGameId: string, namespace: Namespace): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(activeGameId);
        if (!activeGame) {
            return;
        }

        const combatReady = activeGame.currentAttack?.attackerPosture && activeGame.currentAttack?.defenderPosture;
        if (!combatReady) {
            //namespace.to(gameId).emit(SocketEvent.AttackPostureChosen, data);
            return;
        }

        this.turnService.clearCombatTimer(activeGame);

        const combatResolved = await this.applyCombatTurn(activeGameId);
        if (combatResolved === null) {
            return;
        }

        const currentPlayerName = activeGame.turnOrder[activeGame.currentPlayerIndex];
        if (combatResolved && currentPlayerName) {
            await this.handlePostCombatEndScenario(currentPlayerName, activeGameId, namespace);
            return;
        }
    }

    private async choosePosture(gameId: string, playerName: string, posture: AttackPosture) {
        try {
            return await this.activeGameService.choosePosture(gameId, playerName, posture);
        } catch (error) {
            if (this.isNoOngoingAttackError(error)) {
                return null;
            }
            throw error;
        }
    }

    private async applyCombatTurn(gameId: string): Promise<boolean | null> {
        try {
            return await this.actionService.applyCombatTurn(gameId);
        } catch (error) {
            if (this.isNoOngoingAttackError(error)) {
                return null;
            }
            throw error;
        }
    }

    private async handlePostCombatEndScenario(attackerName: string, gameId: string, namespace: Namespace): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) {
            return;
        }

        await this.gameplayTurnEndService.emitGameEndedIfNeeded(gameId, namespace);

        const attackerIsVirtual = activeGame.players.find((player) => player.name === attackerName)?.virtualPlayerProfile;
        if (attackerIsVirtual) {
            if (this.virtualPlayerTurnFinalizerService.isTurnInProgress(gameId)) {
                return;
            }

            await this.turnService.endTurn(gameId);
            return;
        }

        await this.gameplayTurnEndService.checkEndTurnIfNoMovesLeft(gameId, attackerName);
    }

    private isNoOngoingAttackError(error: unknown): boolean {
        return error instanceof AppError && error.errorCodes.includes(ErrorCode.NoOngoingAttack);
    }
}
