import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HTTP_CLIENT } from '@app/http/http-client-token';
import { SocketService } from '@app/services/socket.service';
import { dijkstra } from '@app/utils/dijkstra';
import { IActiveGame } from '@common/activeGame';
import { AttackResult } from '@common/attackResult';
import { ICharacter } from '@common/character';
import { Namespaces } from '@common/namespaces';
import { PlayerMovedResult } from '@common/playerMovedResult';
import { SocketEvent } from '@common/socket-events';
import { IAttackData, IDebugTeleportData, IDebugToggleState, IPlayerMoveData, ITurnStartedPayload } from '@common/socket-payloads';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LocalPlayerService } from './local-player.service';
import { ToastService } from './toast.service';

@Injectable({
    providedIn: 'root',
})
export class ActiveGameService implements OnDestroy {
    private readonly toastService: ToastService = inject(ToastService);
    private readonly httpService = inject(HTTP_CLIENT);
    private readonly socket = inject(SocketService);
    private readonly localPlayer = inject(LocalPlayerService);
    activeGame: IActiveGame;

    isLoading = signal(false);

    private readonly router = inject(Router);

    private _isDebugMode = signal(false);

    isDebugMode = this._isDebugMode.asReadonly();

    hasChangedLocation = signal(false);

    hasAbandonned = signal(false);

    gameHasEnded = signal(false);

    attackMode = signal(false);

    private playerKickedSubscription?: Subscription;
    private playerLeftSubscription?: Subscription;
    private playerMovedSubscription?: Subscription;
    private turnPreparingSubscription?: Subscription;
    private turnStartedSubscription?: Subscription;
    private attackResultSubscription?: Subscription;
    private playerAbandonedSubscription?: Subscription;
    private gameCanceledSubscription?: Subscription;
    private gameEndedSubscription?: Subscription;
    private setActiveGameSubscription?: Subscription;

    constructor() {
        this.socket.connect(Namespaces.Game);

        this.playerMovedSubscription = this.socket.on<PlayerMovedResult>(Namespaces.Game, SocketEvent.PlayerMoved).subscribe((playerMove) => {
            if (!this.activeGame) {
                return;
            }

            const player = this.getPlayerByName(playerMove.playerId);
            if (!player) return;

            player.positionGrille.x = playerMove.newPosition.x;
            player.positionGrille.y = playerMove.newPosition.y;
            player.movementLeft = playerMove.movementLeft;

            this.hasChangedLocation.set(!this.hasChangedLocation());
        });

        this.turnPreparingSubscription = this.socket.on<{ player: string }>(Namespaces.Game, SocketEvent.TurnPreparing).subscribe((data) => {
            if (!this.activeGame) {
                return;
            }

            const index = this.activeGame.turnOrder.findIndex((playerName) => playerName === data.player);
            if (index !== -1) {
                this.activeGame.currentPlayerIndex = index;
                this.currentPlayer.set(index);
                this.hasChangedLocation.set(!this.hasChangedLocation());
            }
        });

        this.turnStartedSubscription = this.socket.on<ITurnStartedPayload>(Namespaces.Game, SocketEvent.TurnStarted).subscribe((data) => {
            if (!this.activeGame) {
                return;
            }

            const index = this.activeGame.turnOrder.findIndex((playerName) => playerName === data.player);
            const currentPlayer = this.getPlayerByName(data.player);

            if (index !== -1 && currentPlayer) {
                currentPlayer.movementLeft = data.movementLeft;
                currentPlayer.actionsLeft = data.actionLeft;
                this.activeGame.currentPlayerIndex = index;
                this.currentPlayer.set(index);
                this.hasChangedLocation.set(!this.hasChangedLocation());
            }
        });

        this.attackResultSubscription = this.socket.on<AttackResult>(Namespaces.Game, SocketEvent.AttackResult).subscribe((data) => {
            if (!this.activeGame) {
                return;
            }

            const attacker = this.getPlayerByName(data.attackerName);
            const defender = this.getPlayerByName(data.defenderName);
            if (!defender || !attacker) return;

            attacker.victories = data.attackerVictories;
            attacker.actionsLeft = data.attackerActionsLeft;
            defender.positionGrille.x = data.defenderNewPosition.x;
            defender.positionGrille.y = data.defenderNewPosition.y;

            this.hasChangedLocation.set(!this.hasChangedLocation());
        });
        this.playerAbandonedSubscription = this.socket.on<{ playerId: string }>(Namespaces.Game, SocketEvent.PlayerAbandoned).subscribe((data) => {
            if (!this.activeGame) {
                return;
            }

            const player = this.getPlayerByName(data.playerId);
            if (!player) return;

            player.hasAbandoned = true;

            this.hasAbandonned.set(!this.hasAbandonned());
        });
        this.playerKickedSubscription = this.socket.on<{ playerId: string }>(Namespaces.Game, SocketEvent.PlayerKicked).subscribe((data) => {
            if (!this.activeGame) {
                return;
            }

            if (this.activeGame?.players) {
                this.activeGame.players = this.activeGame.players.filter((p: ICharacter) => p.name !== data.playerId);
            }

            if (data.playerId !== this.localPlayer.getLocalPlayer()?.name) {
                return;
            }

            this.localPlayer.clear();
            this.toastService.show('Vous avez été expulsé de la partie');
            this.router.navigate(['/']);
        });
        this.playerLeftSubscription = this.socket.on<{ playerId: string }>(Namespaces.Game, SocketEvent.LeftWaitingRoom).subscribe((data) => {
            if (!this.activeGame) {
                return;
            }

            const player = this.getPlayerByName(data.playerId);
            if (!player) return;
            this.activeGame.players = this.activeGame.players.filter((p: ICharacter) => p.name !== data.playerId);
        });
        this.gameEndedSubscription = this.socket.on<{ winner: string }>(Namespaces.Game, SocketEvent.GameEnded).subscribe((data) => {
            if (!this.activeGame) {
                return;
            }

            this.activeGame.winner = data.winner;
            this.activeGame.isFinished = true;

            this.gameHasEnded.set(!this.gameHasEnded());
        });
        this.gameCanceledSubscription = this.socket.on<{ winner: string }>(Namespaces.Game, SocketEvent.GameCanceled).subscribe(() => {
            this.localPlayer.clear();
            this.toastService.show("L'organiseur a annulé la partie.");
            this.router.navigate(['/home']);
        });
    }

    applyDebugModeState(data: IDebugToggleState) {
        if (!this.activeGame) {
            return;
        }
        if (data.playerName !== this.activeGame.organizerName) return;
        this.activeGame.isDebugMode = data.isDebugMode;
        this._isDebugMode.set(data.isDebugMode);
    }

    setActiveGame(id: string): void {
        this.isLoading.set(true);
        this.setActiveGameSubscription?.unsubscribe();
        this.setActiveGameSubscription = this.httpService.get<IActiveGame>(environment.apiUrl + '/activeGame/' + id).subscribe({
            next: (game) => {
                this.activeGame = game;
                this._isDebugMode.set(game.isDebugMode);
                this.currentPlayer.set(game.currentPlayerIndex ?? 0);

                this.removeUnusedSpawnPoints();

                this.socket.emit(Namespaces.Game, SocketEvent.JoinGame, game._id);
            },
            error: () => {
                this.isLoading.set(false);
                this.setActiveGameSubscription = undefined;
            },
            complete: () => {
                this.isLoading.set(false);
                this.setActiveGameSubscription = undefined;
            },
        });
    }
    reachableTiles = new Set<number>();

    currentPlayer = signal<number>(0);

    toggleAttackMode(): void {
        this.attackMode.update((v) => !v);
    }

    getPlayerByName(playerName: string): ICharacter | undefined {
        return this.activeGame.players.find((player) => player.name === playerName);
    }

    getPlayersAtPosition(row: number, col: number): ICharacter[] {
        return this.activeGame.players.filter((player) => !player.hasAbandoned && player.positionGrille.y === row && player.positionGrille.x === col);
    }

    getCurrentPlayer(): ICharacter | undefined {
        const currentPlayerName = this.activeGame.turnOrder[this.currentPlayer()];
        return this.getPlayerByName(currentPlayerName);
    }

    getIndex(row: number, column: number, totalColumns: number): number {
        return row * totalColumns + column;
    }

    kickPlayer(playerName: string) {
        this.socket.emit(Namespaces.Game, SocketEvent.PlayerKick, {
            gameId: this.activeGame._id,
            playerId: playerName,
        });
    }
    leaveWaitingRoom(playerName: string) {
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

        // keepalive allows the browser to continue sending during unload/refresh.
        void fetch(url, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(payload),
            keepalive: true,
        });
    }

    ngOnDestroy(): void {
        this.playerMovedSubscription?.unsubscribe();
        this.turnPreparingSubscription?.unsubscribe();
        this.turnStartedSubscription?.unsubscribe();
        this.attackResultSubscription?.unsubscribe();
        this.playerKickedSubscription?.unsubscribe();
        this.playerAbandonedSubscription?.unsubscribe();
        this.gameEndedSubscription?.unsubscribe();
        this.setActiveGameSubscription?.unsubscribe();
        this.playerLeftSubscription?.unsubscribe();
        this.gameCanceledSubscription?.unsubscribe();
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
        if (!this.activeGame) return;

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

        this.reachableTiles.clear();

        for (let i = 0; i < distances.length; i++) {
            if (distances[i] <= player.movementLeft) {
                this.reachableTiles.add(i);
            }
        }
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
        this.socket.emit(Namespaces.Game, SocketEvent.PlayerAbandon, {
            gameId: this.activeGame._id,
            playerId: playerName,
        });
    }

    attackPlayer(targetPlayerName: string): void {
        const attacker = this.getCurrentPlayer();
        const target = this.getPlayerByName(targetPlayerName);

        if (!attacker) return;

        if (attacker === target) return;

        if (!target) return;

        const dx = Math.abs(attacker.positionGrille.x - target.positionGrille.x);
        const dy = Math.abs(attacker.positionGrille.y - target.positionGrille.y);

        if (dx + dy !== 1) return;

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
        if (this.activeGame.turnOrder.length === 0) return;
        this.activeGame.game.board.items = this.activeGame.game.board.items.filter(
            (item) => item.itemType !== 'startingPosition' || this.getPlayersAtPosition(item.x, item.y).length > 0,
        );
    }
}
