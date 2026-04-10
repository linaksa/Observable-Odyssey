import { inject, Injectable } from '@angular/core';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GamePopupStateService } from '@app/services/gameplay/game-popup-state.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { DebugSocketService } from '@app/services/realtime/debug.socket.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { ICurrentAttack } from '@common/activeGame';
import { ICharacter } from '@common/character';
import { TurnStatusData } from '@common/info';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { IJoinGamePayload } from '@common/socket-payloads';
import { Observable } from 'rxjs';

@Injectable()
export class GamePageFacadeService {
    private readonly debugSocketService = inject(DebugSocketService);
    private readonly socketService = inject(SocketService);
    readonly activeGameService = inject(ActiveGameService);
    private readonly popupStateService = inject(GamePopupStateService);
    private readonly localPlayerService = inject(LocalPlayerService);
    private readonly gameTurnService = inject(GameTurnService);

    get currentAttack(): ICurrentAttack | null {
        return this.activeGameService.activeGame?.currentAttack;
    }

    get currentPlayerName(): string | null {
        return this.gameTurnService.currentPlayerName;
    }

    get turnTimeLeftSeconds(): number | null {
        return this.gameTurnService.turnTimeLeftSeconds();
    }

    get isTurnPreparing(): boolean {
        return this.gameTurnService.isTurnPreparing();
    }

    get canEndTurn(): boolean {
        return this.gameTurnService.canEndTurn;
    }

    get isGameFinished(): boolean {
        return this.activeGameService.activeGame?.isFinished ?? false;
    }

    get turnStatusData(): TurnStatusData {
        return {
            currentPlayerName: this.currentPlayerName,
            turnTimeLeftSeconds: this.turnTimeLeftSeconds,
            isTurnPreparing: this.isTurnPreparing,
            canEndTurn: this.canEndTurn,
        };
    }

    get pendingFlagQuestion(): string | null {
        return this.activeGameService.pendingFlagRequest()?.question ?? null;
    }

    connectDebugSocket(): void {
        this.debugSocketService.connect();
    }

    closeAllPopups(): void {
        this.popupStateService.closeAllPopups();
    }

    resolveActiveGameId(routeActiveGameId?: string): string | undefined {
        return routeActiveGameId ?? this.activeGameService.activeGame?._id;
    }

    setActiveGame(activeGameId: string): void {
        this.activeGameService.setActiveGame(activeGameId);
    }

    connectGameplaySocket(): void {
        this.socketService.connect(Namespaces.Game);
    }

    onPlayersUpdated(): Observable<ICharacter[]> {
        return this.socketService.on<ICharacter[]>(Namespaces.Game, SocketEvent.PlayersUpdated);
    }

    applyPlayersUpdate(players: ICharacter[]): void {
        this.activeGameService.updatePlayers(players);
    }

    initializeTurnListeners(): void {
        this.gameTurnService.initializeTurnListeners();
    }

    emitJoinGame(activeGameId: string): void {
        this.socketService.emit<IJoinGamePayload, void>(Namespaces.Game, SocketEvent.JoinGame, {
            activeGameId,
            playerName: this.localPlayerService.getLocalPlayer()?.name,
        });
    }

    emitDebugToggle(): void {
        const playerName = this.localPlayerService.getLocalPlayer()?.name ?? '';
        const activeGameId = this.activeGameService.activeGame?._id ?? '';
        this.debugSocketService.emitDebugModeToggle(playerName, activeGameId);
    }

    getLocalPlayer(): ICharacter | undefined {
        return this.localPlayerService.getLocalPlayer();
    }

    endTurn(): void {
        this.gameTurnService.endTurn();
    }

    respondToFlagRequest(accepted: boolean): void {
        this.activeGameService.respondToFlagActionRequest(accepted);
    }

    abandonGame(): void {
        const player = this.localPlayerService.getLocalPlayer();
        if (!player) {
            return;
        }

        this.activeGameService.abandonGame(player.name);
    }

    destroyTurnService(): void {
        this.gameTurnService.destroy();
    }
}
