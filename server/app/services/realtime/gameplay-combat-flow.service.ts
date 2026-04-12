import { AppError } from '@app/error-types/app-error';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { ActionService } from '@app/services/gameplay/action-service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { GameplayTurnEndService } from '@app/services/realtime/gameplay-turn-end.service';
import { VirtualPlayerTurnFinalizerService } from '@app/services/virtual-player/virtual-player-turn-finalizer.service';
import { AttackPosture } from '@common/attackResult';
import { ICharacter, VirtualPlayerProfile } from '@common/character';
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

        this.turnService.startCombatTimer(COMBAT_TIME_MS, activeGame, async () => {
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
        });

        context.namespace.to(gameId).emit(SocketEvent.CombatStarted, result);
        context.namespace.to(gameId).emit(SocketEvent.CombatTurnStart, result);
        await this.autoChooseVirtualPostures(gameId, context.namespace);
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

        const combatReady = updatedActiveGame.currentAttack?.attackerPosture && updatedActiveGame.currentAttack?.defenderPosture;
        if (!combatReady) {
            namespace.to(gameId).emit(SocketEvent.AttackPostureChosen, data);
            return;
        }

        this.turnService.clearCombatTimer(updatedActiveGame);

        const combatResolved = await this.applyCombatTurn(gameId);
        if (combatResolved === null) {
            return;
        }

        const currentPlayerName = updatedActiveGame.turnOrder[updatedActiveGame.currentPlayerIndex];
        if (combatResolved && currentPlayerName) {
            await this.handlePostCombatEndScenario(currentPlayerName, gameId, namespace);
            return;
        }

        await this.autoChooseVirtualPostures(gameId, namespace);
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

    private async autoChooseVirtualPostures(gameId: string, namespace: Namespace): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const currentAttack = activeGame?.currentAttack;
        if (!activeGame || !currentAttack) {
            return;
        }

        const attacker = activeGame.players.find((player) => player.name === currentAttack.attacker);
        if (attacker && !currentAttack.attackerPosture && attacker.virtualPlayerProfile) {
            await this.handleChooseAttackPosture(
                {
                    gameId,
                    playerName: attacker.name,
                    posture: this.getVirtualPosture(attacker),
                },
                namespace,
            );
        }

        const refreshedGame = await this.activeGameService.getActiveGameById(gameId);
        const refreshedAttack = refreshedGame?.currentAttack;
        if (!refreshedGame || !refreshedAttack) {
            return;
        }

        const refreshedDefender = refreshedGame.players.find((player) => player.name === refreshedAttack.defender);
        if (refreshedDefender && !refreshedAttack.defenderPosture && refreshedDefender.virtualPlayerProfile) {
            await this.handleChooseAttackPosture(
                {
                    gameId,
                    playerName: refreshedDefender.name,
                    posture: this.getVirtualPosture(refreshedDefender),
                },
                namespace,
            );
        }
    }

    private getVirtualPosture(player: ICharacter): AttackPosture {
        return player.virtualPlayerProfile === VirtualPlayerProfile.Defensive ? AttackPosture.Defensive : AttackPosture.Offensive;
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
