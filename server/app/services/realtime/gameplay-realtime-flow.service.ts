import { GameplayCombatFlowService, ICombatFlowContext } from '@app/services/realtime/gameplay-combat-flow.service';
import { GameplayFlagDecisionService } from '@app/services/realtime/gameplay-flag-decision.service';
import { GameplayInteractionFlowService } from '@app/services/realtime/gameplay-interaction-flow.service';
import { GameplayLogService } from '@app/services/realtime/gameplay-log.service';
import { GameplayMovementFlowService } from '@app/services/realtime/gameplay-movement-flow.service';
import {
    IActionData,
    IAttackPostureData,
    IDoorToggleData,
    IFlagDecisionData,
    IPlayerMoveData,
    ISanctuaryInteractionData,
} from '@common/socket-payloads';
import { Namespace, Socket } from 'socket.io';
import { Service } from 'typedi';

@Service()
export class GameplayRealtimeFlowService {
    constructor(
        private readonly gameplayMovementFlowService: GameplayMovementFlowService,
        private readonly gameplayInteractionFlowService: GameplayInteractionFlowService,
        private readonly gameplayCombatFlowService: GameplayCombatFlowService,
        private readonly gameplayFlagDecisionService: GameplayFlagDecisionService,
        private readonly gameplayLogService: GameplayLogService,
    ) {}

    async handlePlayerMove(data: IPlayerMoveData, socket: Socket, namespace: Namespace): Promise<void> {
        await this.gameplayMovementFlowService.handlePlayerMove(data, socket, namespace);
    }

    async handleToggleDoor(
        data: IDoorToggleData,
        socket: Socket | null,
        namespace: Namespace,
        emitGameLog: (gameId: string, message: string) => void,
    ): Promise<void> {
        await this.gameplayInteractionFlowService.handleToggleDoor(data, socket, namespace, emitGameLog);
    }

    async handleSanctuaryInteraction(
        data: ISanctuaryInteractionData,
        socket: Socket | null,
        namespace: Namespace,
        emitGameLog: (gameId: string, message: string) => void,
    ): Promise<void> {
        await this.gameplayInteractionFlowService.handleSanctuaryInteraction(data, socket, namespace, emitGameLog);
    }

    async combatManager(
        gameId: string,
        attackerName: string,
        defenderName: string,
        socket: Socket | null,
        context: ICombatFlowContext,
    ): Promise<void> {
        await this.gameplayCombatFlowService.combatManager(gameId, attackerName, defenderName, socket, context);
    }

    async canUseAction(gameId: string, attackerName: string, defenderName: string): Promise<boolean> {
        return await this.gameplayCombatFlowService.canUseAction(gameId, attackerName, defenderName);
    }

    async handleChooseAttackPosture(data: IAttackPostureData, namespace: Namespace): Promise<void> {
        await this.gameplayCombatFlowService.handleChooseAttackPosture(data, namespace);
    }

    async handleFlagAction(data: IActionData, namespace: Namespace, emitGameLog: (gameId: string, message: string) => void): Promise<boolean> {
        return await this.gameplayFlagDecisionService.handleFlagAction(data, namespace, emitGameLog);
    }

    async handleFlagTaken(data: IFlagDecisionData, namespace: Namespace, emitGameLog: (gameId: string, message: string) => void): Promise<void> {
        await this.gameplayFlagDecisionService.handleFlagTaken(data, namespace, emitGameLog);
    }

    async handleFlagGiven(data: IFlagDecisionData, namespace: Namespace, emitGameLog: (gameId: string, message: string) => void): Promise<void> {
        await this.gameplayFlagDecisionService.handleFlagGiven(data, namespace, emitGameLog);
    }

    clearPendingFlagRequest(gameId: string): void {
        this.gameplayFlagDecisionService.clearPendingRequest(gameId);
    }

    async checkEndTurnIfNoMovesLeft(gameId: string, playerId: string): Promise<void> {
        await this.gameplayMovementFlowService.checkEndTurnIfNoMovesLeft(gameId, playerId);
    }

    async emitGameEndedIfNeeded(gameId: string, namespace: Namespace): Promise<boolean> {
        return await this.gameplayMovementFlowService.emitGameEndedIfNeeded(gameId, namespace);
    }

    emitGameLogToRoom(gameId: string, message: string, namespace?: Namespace): void {
        this.gameplayLogService.emitGameLogToRoom(gameId, message, namespace);
    }
}
