/* eslint-disable max-lines */
// recheck this file after refactor to see if some functions can be moved to other services to take out some lines
import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '@app/services/admin/game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { ToastService } from '@app/services/ui/toast.service';
import { PendingFlagRequest } from '@app/interfaces/pending-flag-request.interface';
import { ToggleSignalRef } from '@app/interfaces/toggle-signal-ref.interface';
import { dijkstra } from '@app/utils/dijkstra';
import { IActiveGame } from '@common/activeGame';
import { ICharacter } from '@common/character';
import { SanctuaryChoice } from '@common/info';
import { IMessage } from '@common/message';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';

import {
    IActionData,
    IAttackPostureData,
    IDebugTeleportData,
    IDebugToggleState,
    IDoorToggleData,
    IFlagActionData,
    IFlagDecisionData,
    IPlayerMoveData,
    ISanctuaryInteractedResult,
    ISanctuaryInteractionData,
} from '@common/socket-payloads';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

import { AttackPosture, CombatOutcome, CombatTurnOutcome } from '@common/attackResult';
import { ItemType } from '@common/items';
import { registerActiveGameSocketListeners } from './active-game-socket-listeners';

@Injectable({
    providedIn: 'root',
})
export class ActiveGameService implements OnDestroy {
    private readonly toastService = inject(ToastService);
    private readonly gameService = inject(GameService);
    private readonly socket = inject(SocketService);
    private readonly localPlayer = inject(LocalPlayerService);
    private readonly router = inject(Router);

    private readonly socketSubscriptions: Subscription[] = [];
    private setActiveGameSubscription?: Subscription;

    private _isDebugMode = signal(false);
    isDebugMode = this._isDebugMode.asReadonly();

    activeGame: IActiveGame;

    isLoading = signal(false);
    hasChangedLocation = signal(false);
    hasAbandoned = signal(false);
    gameHasEnded = signal(false);
    actionMode = signal(false);
    pendingFlagRequest = signal<PendingFlagRequest | null>(null);
    combatOutcome = signal(null as CombatOutcome | null);
    sanctuaryOutcome = signal<ISanctuaryInteractedResult | null>(null);
    readonly actionStatsVersion = signal(0);
    private readonly _chatMessages = signal<IMessage[]>([]);
    readonly chatMessages = this._chatMessages.asReadonly();

    reachableTiles = new Set<number>();
    readonly roundOutcome = signal<CombatTurnOutcome | null>(null);

    currentPlayer = signal<number>(0);

    constructor() {
        this.socket.connect(Namespaces.Game);

        this.socketSubscriptions.push(
            ...registerActiveGameSocketListeners({
                socket: this.socket,
                localPlayer: this.localPlayer,
                toastService: this.toastService,
                router: this.router,
                getActiveGame: () => this.activeGame,
                setActiveGame: (activeGame: IActiveGame) => this.updateActiveGame(activeGame),
                setCombatOutcome: (combatOutcome: CombatOutcome) => this.combatOutcome.set(combatOutcome),
                setSanctuaryOutcome: (sanctuaryOutcome: ISanctuaryInteractedResult | null) => this.sanctuaryOutcome.set(sanctuaryOutcome),
                setRoundOutcome: (roundOutcome: CombatTurnOutcome | null) => this.roundOutcome.set(roundOutcome),
                bumpActionStatsVersion: () => this.actionStatsVersion.update((current) => current + 1),
                getPlayerByName: (playerName) => this.getPlayerByName(playerName),
                currentPlayer: this.currentPlayer,
                hasChangedLocation: this.hasChangedLocation,
                hasAbandoned: this.hasAbandoned,
                gameHasEnded: this.gameHasEnded,
                handleFlagActionRequest: (data, acceptEvent) => this.handleFlagActionRequest(data, acceptEvent),
                closeFlagActionRequestIfExpired: (currentTurnPlayerName) => this.closeFlagActionRequestIfExpired(currentTurnPlayerName),
            }),
        );
    }

    private toggle(signalRef: ToggleSignalRef): void {
        signalRef.update((current) => !current);
    }

    private syncChatMessages(messages: IMessage[]): void {
        const nextMessages = [...messages];
        this._chatMessages.set(nextMessages);

        if (this.activeGame) {
            this.activeGame.messages = nextMessages;
        }
    }

    private getCurrentChatMessages(): IMessage[] {
        const activeGameMessages = this.activeGame?.messages ?? [];
        const signalMessages = this._chatMessages();

        return activeGameMessages.length > signalMessages.length ? activeGameMessages : signalMessages;
    }

    setChatMessages(messages: IMessage[]): void {
        const currentMessages = this.getCurrentChatMessages();
        const nextMessages = currentMessages.length > messages.length ? currentMessages : messages;

        this.syncChatMessages(nextMessages);
    }

    appendChatMessage(message: IMessage): void {
        this.syncChatMessages([...this.getCurrentChatMessages(), message]);
    }

    private updateActiveGame(activeGame: IActiveGame): void {
        this.activeGame = this.mergeMessages(activeGame);
        this.removeUnusedSpawnPoints();
        this.syncChatMessages(this.activeGame.messages ?? []);
    }

    private mergeMessages(game: IActiveGame): IActiveGame {
        const currentMessages = this.getCurrentChatMessages();

        if (this.activeGame?._id === game._id && currentMessages.length > game.messages.length) {
            return {
                ...game,
                messages: [...currentMessages],
            };
        }

        return game;
    }

    applyDebugModeState(data: IDebugToggleState) {
        if (!this.activeGame || data.playerName !== this.activeGame.organizerName) {
            return;
        }

        this.activeGame.isDebugMode = data.isDebugMode;
        this._isDebugMode.set(data.isDebugMode);
    }

    setActiveGame(id: string): void {
        this.isLoading.set(true);
        this.setActiveGameSubscription?.unsubscribe();

        const subscription = this.gameService
            .getActiveGameById(id)
            .pipe(
                finalize(() => {
                    this.isLoading.set(false);
                    this.setActiveGameSubscription = undefined;
                }),
            )
            .subscribe({
                next: (game) => {
                    if (!game) {
                        return;
                    }

                    this.updateActiveGame(game);
                    this._isDebugMode.set(game.isDebugMode);
                    this.currentPlayer.set(game.currentPlayerIndex ?? 0);

                    this.hasChangedLocation.update((current) => !current);

                    this.socket.emit(Namespaces.Game, SocketEvent.JoinGame, game._id);
                },
            });

        this.setActiveGameSubscription = subscription;
        if (subscription.closed) {
            this.setActiveGameSubscription = undefined;
        }
    }

    toggleActionMode(): void {
        this.toggle(this.actionMode);
    }

    getPlayerByName(playerName: string): ICharacter | undefined {
        return this.activeGame?.players.find((player) => player.name === playerName);
    }

    getPlayersAtPosition(row: number, col: number): ICharacter[] {
        return (
            this.activeGame?.players.filter(
                (player) => !player.hasAbandoned && player.currentPosition.y === row && player.currentPosition.x === col,
            ) ?? []
        );
    }

    getCurrentPlayer(): ICharacter | undefined {
        const currentPlayerName = this.activeGame?.turnOrder[this.currentPlayer()];
        return currentPlayerName ? this.getPlayerByName(currentPlayerName) : undefined;
    }

    getIndex(row: number, column: number, totalColumns: number): number {
        return row * totalColumns + column;
    }

    kickPlayer(playerName: string) {
        if (!this.activeGame) {
            return;
        }
        this.socket.emit(Namespaces.Game, SocketEvent.PlayerKick, {
            gameId: this.activeGame._id,
            playerId: playerName,
        });
    }

    leaveWaitingRoom(playerName: string) {
        if (!this.activeGame) {
            return;
        }
        this.socket.emit(Namespaces.Game, SocketEvent.LeaveWaitingRoom, {
            gameId: this.activeGame._id,
            playerId: playerName,
        });
    }

    leaveActiveGameOnUnload(playerName: string, activeGameId: string): void {
        const payload = { activeGameId, playerName };
        const url = `${environment.apiUrl}/activeGame/leave`;
        const headers = new Headers();

        headers.set('Content-Type', 'application/json');

        void fetch(url, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(payload),
            keepalive: true, // keepalive allows the browser to continue sending during unload/refresh.
        });
    }

    ngOnDestroy(): void {
        this.socketSubscriptions.forEach((subscription) => subscription.unsubscribe());
        this.setActiveGameSubscription?.unsubscribe();
    }

    updatePlayers(players: ICharacter[]): void {
        if (!this.activeGame) {
            return;
        }

        this.activeGame = {
            ...this.activeGame,
            players: [...players],
        };

        this.syncTurnOrderWithPlayers();
        this.hasChangedLocation.update((current) => !current);
    }

    private syncTurnOrderWithPlayers(): void {
        if (!this.activeGame) {
            return;
        }

        const currentPlayerName = this.activeGame.turnOrder[this.activeGame.currentPlayerIndex];
        const activePlayerNames = new Set(this.activeGame.players.map((player) => player.name));
        this.activeGame.turnOrder = this.activeGame.turnOrder.filter((name) => activePlayerNames.has(name));

        if (this.activeGame.turnOrder.length === 0) {
            this.activeGame.currentPlayerIndex = 0;
            this.currentPlayer.set(0);
            return;
        }

        const nextIndex = this.activeGame.turnOrder.indexOf(currentPlayerName);
        this.activeGame.currentPlayerIndex =
            nextIndex === -1 ? Math.min(this.activeGame.currentPlayerIndex, this.activeGame.turnOrder.length - 1) : nextIndex;
        this.currentPlayer.set(this.activeGame.currentPlayerIndex);
    }

    updateMovementRange(totalColumns: number, graph: [number, number][][]) {
        if (totalColumns <= 0 || graph.length === 0) {
            return;
        }

        const player = this.getCurrentPlayer();
        if (!player) {
            return;
        }

        const startIndex = this.getIndex(player.currentPosition.y, player.currentPosition.x, totalColumns);
        const dijkstraRes = dijkstra(graph, startIndex);
        const reachableTiles = new Set<number>();

        for (let i = 0; i < dijkstraRes.distances.length; i++) {
            if (dijkstraRes.distances[i] <= player.movementLeft) {
                reachableTiles.add(i);
            }
        }

        this.reachableTiles = reachableTiles;
    }

    tryMove(rowOffset: number, colOffset: number, totalColumns: number) {
        const player = this.getCurrentPlayer();
        if (!player) {
            return;
        }

        const newRow = player.currentPosition.y + rowOffset;
        const newCol = player.currentPosition.x + colOffset;
        const index = this.getIndex(newRow, newCol, totalColumns);

        if (!this.reachableTiles.has(index)) {
            return;
        }

        const moveData: IPlayerMoveData = {
            gameId: this.activeGame._id,
            playerId: player.name,
            direction: {
                x: newCol,
                y: newRow,
            },
        };

        this.socket.emit<IPlayerMoveData, void>('game', SocketEvent.PlayerMove, moveData);
    }

    toggleDoor(row: number, col: number): void {
        const player = this.getCurrentPlayer();
        if (!player || !this.activeGame) {
            return;
        }

        this.socket.emit<IDoorToggleData, void>(Namespaces.Game, SocketEvent.ToggleDoor, {
            gameId: this.activeGame._id,
            playerId: player.name,
            position: {
                x: col,
                y: row,
            },
        });
    }

    interactSanctuary(row: number, col: number, choice: SanctuaryChoice): void {
        const player = this.getCurrentPlayer();
        if (!player || !this.activeGame) {
            return;
        }

        this.socket.emit<ISanctuaryInteractionData, void>(Namespaces.Game, SocketEvent.InteractSanctuary, {
            gameId: this.activeGame._id,
            playerId: player.name,
            choice,
            position: {
                x: col,
                y: row,
            },
        });
    }

    abandonGame(playerName: string): void {
        if (!this.activeGame) {
            return;
        }
        this.socket.emit(Namespaces.Game, SocketEvent.PlayerAbandon, {
            gameId: this.activeGame._id,
            playerId: playerName,
        });
    }

    actionOnPlayer(targetPlayerName: string): void {
        const currentPlayer = this.getCurrentPlayer();
        const target = this.getPlayerByName(targetPlayerName);

        if (!currentPlayer || !target || currentPlayer === target) {
            return;
        }

        const dx = Math.abs(currentPlayer.currentPosition.x - target.currentPosition.x);
        const dy = Math.abs(currentPlayer.currentPosition.y - target.currentPosition.y);

        if (dx + dy !== 1) {
            return;
        }

        const actionData: IActionData = {
            gameId: this.activeGame._id,
            currentPlayerName: currentPlayer.name,
            targetName: target.name,
        };

        this.socket.emit(Namespaces.Game, SocketEvent.Action, actionData);
        this.actionMode.set(false);
    }

    handleFlagActionRequest(data: IFlagActionData, acceptEvent: SocketEvent.TakeFlag | SocketEvent.GiveFlag): void {
        const localPlayerName = this.localPlayer.getLocalPlayer()?.name;
        if (!localPlayerName || data.targetPlayerName !== localPlayerName) {
            return;
        }

        if (!this.activeGame) {
            return;
        }

        const isTakingFlag = acceptEvent === SocketEvent.TakeFlag;
        const question = isTakingFlag
            ? `${data.currentPlayerName} veut prendre votre drapeau. Voulez-vous le lui donner ?`
            : `${data.currentPlayerName} veut vous donner son drapeau. Voulez-vous le prendre ?`;

        this.pendingFlagRequest.set({ data, acceptEvent, question });
    }

    respondToFlagActionRequest(accepted: boolean): void {
        const pendingRequest = this.pendingFlagRequest();
        if (!pendingRequest) {
            return;
        }

        this.pendingFlagRequest.set(null);
        const { data, acceptEvent } = pendingRequest;

        const isTakingFlag = acceptEvent === SocketEvent.TakeFlag;

        if (!accepted) {
            this.toastService.show(isTakingFlag ? 'Vous avez refusé de donner votre drapeau.' : 'Vous avez refusé de prendre le drapeau.');
            return;
        }

        const currentPlayer = this.getPlayerByName(data.currentPlayerName);
        if (currentPlayer) {
            currentPlayer.actionsLeft = data.currentPlayerActionsLeft;
            this.actionStatsVersion.update((current) => current + 1);
        }

        this.activeGame.hasFlagId = isTakingFlag ? data.currentPlayerName : data.targetPlayerName;
        if (isTakingFlag) {
            const responseData: IFlagDecisionData = {
                gameId: data.gameId,
                newFlagCarrierName: data.currentPlayerName,
            };
            this.socket.emit(Namespaces.Game, SocketEvent.FlagTaken, responseData);
        } else {
            const responseData: IFlagDecisionData = {
                gameId: data.gameId,
                newFlagCarrierName: data.targetPlayerName,
            };
            this.socket.emit(Namespaces.Game, SocketEvent.FlagGiven, responseData);
        }
        this.toggle(this.hasChangedLocation);
    }

    closeFlagActionRequestIfExpired(currentTurnPlayerName: string): void {
        const pendingRequest = this.pendingFlagRequest();
        if (!pendingRequest || pendingRequest.data.currentPlayerName === currentTurnPlayerName) {
            return;
        }

        this.pendingFlagRequest.set(null);
    }

    debugTeleport(row: number, col: number): void {
        const player = this.getCurrentPlayer();
        if (!player) {
            return;
        }

        this.socket.emit<IDebugTeleportData, void>(Namespaces.Game, SocketEvent.DebugTeleport, {
            gameId: this.activeGame._id,
            playerName: player.name,
            target: { x: col, y: row },
        });
    }

    removeUnusedSpawnPoints(): void {
        if (!this.activeGame || this.activeGame.turnOrder.length === 0) {
            return;
        }

        this.activeGame.game.board.items = this.activeGame.game.board.items.filter(
            (item) =>
                item.itemType !== ItemType.StartingPosition ||
                this.activeGame.players.some(
                    (player) => !player.hasAbandoned && player.startingPosition.x === item.x && player.startingPosition.y === item.y,
                ),
        );
    }

    chooseAttackMode(posture: AttackPosture) {
        const currentPlayerName = this.currentPlayer.name;
        const currentAttack = this.activeGame.currentAttack;
        if (currentAttack && currentAttack?.attacker === currentPlayerName && currentAttack.attackerPosture) {
            return;
        }
        if (currentAttack && currentAttack?.defender === currentPlayerName && currentAttack.defenderPosture) {
            return;
        }
        const playerPosture: IAttackPostureData = {
            gameId: this.activeGame._id,
            playerName: this.localPlayer.getLocalPlayer()?.name ?? '',
            posture,
        };
        this.socket.emit<IAttackPostureData, void>(Namespaces.Game, SocketEvent.ChooseAttackPosture, playerPosture);
    }
}
