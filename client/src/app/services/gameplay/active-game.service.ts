import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '@app/services/admin/game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { ToastService } from '@app/services/ui/toast.service';
import { dijkstra } from '@app/utils/dijkstra';
import { IActiveGame } from '@common/activeGame';
import { ICharacter } from '@common/character';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { IAttackData, IAttackPostureData, IDebugTeleportData, IDebugToggleState, IPlayerMoveData } from '@common/socket-payloads';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

import { AttackPosture } from '@common/attackResult';
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
    hasAbandonned = signal(false);
    gameHasEnded = signal(false);
    attackMode = signal(false);

    reachableTiles = new Set<number>();
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
                setActiveGame: (activeGame: IActiveGame) => (this.activeGame = activeGame),
                getPlayerByName: (playerName) => this.getPlayerByName(playerName),
                currentPlayer: this.currentPlayer,
                hasChangedLocation: this.hasChangedLocation,
                hasAbandonned: this.hasAbandonned,
                gameHasEnded: this.gameHasEnded,
            }),
        );
    }

    private toggle(signalRef: { update: (updater: (current: boolean) => boolean) => void }): void {
        signalRef.update((current) => !current);
    }

    applyDebugModeState(data: IDebugToggleState) {
        if (!this.activeGame) {
            return;
        }

        if (data.playerName !== this.activeGame.organizerName) {
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

                    this.activeGame = game;
                    this._isDebugMode.set(game.isDebugMode);
                    this.currentPlayer.set(game.currentPlayerIndex ?? 0);

                    this.removeUnusedSpawnPoints();

                    this.socket.emit(Namespaces.Game, SocketEvent.JoinGame, game._id);
                },
            });

        this.setActiveGameSubscription = subscription;
        if (subscription.closed) {
            this.setActiveGameSubscription = undefined;
        }
    }

    toggleAttackMode(): void {
        this.toggle(this.attackMode);
    }

    getPlayerByName(playerName: string): ICharacter | undefined {
        return this.activeGame?.players.find((player) => player.name === playerName);
    }

    getPlayersAtPosition(row: number, col: number): ICharacter[] {
        return (
            this.activeGame?.players.filter((player) => !player.hasAbandoned && player.positionGrille.y === row && player.positionGrille.x === col) ??
            []
        );
    }

    getCurrentPlayer(): ICharacter | undefined {
        const currentPlayerName = this.activeGame?.turnOrder[this.currentPlayer()];

        if (!currentPlayerName) {
            return undefined;
        }

        return this.getPlayerByName(currentPlayerName);
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
            nextIndex !== -1 ? nextIndex : Math.min(this.activeGame.currentPlayerIndex, this.activeGame.turnOrder.length - 1);
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

        const startIndex = this.getIndex(player.positionGrille.y, player.positionGrille.x, totalColumns);
        const distances = dijkstra(graph, startIndex);
        const reachableTiles = new Set<number>();

        for (let i = 0; i < distances.length; i++) {
            if (distances[i] <= player.movementLeft) {
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

        const newRow = player.positionGrille.y + rowOffset;
        const newCol = player.positionGrille.x + colOffset;
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

    abandonGame(playerName: string): void {
        if (!this.activeGame) {
            return;
        }

        this.socket.emit(Namespaces.Game, SocketEvent.PlayerAbandon, {
            gameId: this.activeGame._id,
            playerId: playerName,
        });
    }

    attackPlayer(targetPlayerName: string): void {
        const attacker = this.getCurrentPlayer();
        const target = this.getPlayerByName(targetPlayerName);

        if (!attacker || !target || attacker === target) {
            return;
        }

        const dx = Math.abs(attacker.positionGrille.x - target.positionGrille.x);
        const dy = Math.abs(attacker.positionGrille.y - target.positionGrille.y);

        if (dx + dy !== 1) {
            return;
        }

        const attackData: IAttackData = {
            gameId: this.activeGame._id,
            attackerName: attacker.name,
            defenderName: target.name,
        };

        this.socket.emit(Namespaces.Game, SocketEvent.Attack, attackData);
        this.attackMode.set(false);
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
            (item) => item.itemType !== 'startingPosition' || this.getPlayersAtPosition(item.x, item.y).length > 0,
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
