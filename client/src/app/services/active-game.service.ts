import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { HTTP_CLIENT } from '@app/http/http-client-token';
import { SocketService } from '@app/services/socket.service';
import { TimeService } from '@app/services/time-service.service';
import { dijkstra } from '@app/utils/dijkstra';
import { IActiveGame } from '@common/activeGame';
import { AttackResult } from '@common/attackResult';
import { ICharacter } from '@common/character';
import { Namespaces } from '@common/namespaces';
import { PlayerMovedResult } from '@common/playerMovedResult';
import { SocketEvent } from '@common/socket-events';
import { IAttackData, IDebugTeleportData, IPlayerMoveData } from '@common/socket-payloads';
import { Observable, Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class ActiveGameService implements OnDestroy {
    timeService: TimeService = inject(TimeService);

    httpService = inject(HTTP_CLIENT);
    socket = inject(SocketService);

    activeGame: IActiveGame;

    isLoading = signal(false);

    private _isDebugMode = signal(false);

    isDebugMode = this._isDebugMode.asReadonly();

    hasChangedLocation = signal(false);

    hasAbandonned = signal(false);

    gameHasEnded = signal(false);

    attackMode = signal(false);

    private playerMovedSubscription?: Subscription;
    private turnStartedSubscription?: Subscription;
    private attackResultSubscription?: Subscription;
    private playerAbandonedSubscription?: Subscription;
    private gameEndedSubscription?: Subscription;
    private setActiveGameSubscription?: Subscription;

    constructor() {
        this.socket.connect(Namespaces.Game);

        this.playerMovedSubscription = this.socket.on<PlayerMovedResult>(Namespaces.Game, SocketEvent.PlayerMoved).subscribe((playerMove) => {
            const player = this.getPlayerByName(playerMove.playerId);
            if (!player) return;

            player.positionGrille.x = playerMove.newPosition.x;
            player.positionGrille.y = playerMove.newPosition.y;
            player.movementLeft = playerMove.movementLeft;

            this.hasChangedLocation.set(!this.hasChangedLocation());
        });

        this.turnStartedSubscription = this.socket
            .on<{ player: string; movementLeft: number }>(Namespaces.Game, SocketEvent.TurnStarted)
            .subscribe((data) => {
                const index = this.activeGame.players.findIndex((p) => p.name === data.player);

                if (index !== -1) {
                    this.activeGame.players[index].movementLeft = data.movementLeft;
                    this.activeGame.currentPlayerIndex = index;
                    this.currentPlayer.set(index);
                    this.hasChangedLocation.set(!this.hasChangedLocation());
                }
            });

        this.attackResultSubscription = this.socket.on<AttackResult>(Namespaces.Game, SocketEvent.AttackResult).subscribe((data) => {
            const attacker = this.getPlayerByName(data.attackerName);
            const defender = this.getPlayerByName(data.defenderName);
            if (!defender || !attacker) return;

            attacker.victories = data.attackerVictories;
            defender.positionGrille.x = data.defenderNewPosition.x;
            defender.positionGrille.y = data.defenderNewPosition.y;

            this.hasChangedLocation.set(!this.hasChangedLocation());
        });
        this.playerAbandonedSubscription = this.socket.on<{ playerId: string }>(Namespaces.Game, SocketEvent.PlayerAbandoned)
            .subscribe((data) => {
                const player = this.getPlayerByName(data.playerId);
                if (!player) return;

                player.hasAbandoned = true;

                this.hasAbandonned.set(!this.hasAbandonned());
            });

        this.gameEndedSubscription = this.socket.on<{ winner: string }>(Namespaces.Game, SocketEvent.GameEnded)
            .subscribe((data) => {
                this.activeGame.winner = data.winner;
                this.activeGame.isFinished = true;

                this.gameHasEnded.set(!this.gameHasEnded());
            });
    }

    toggleDebugMode(playerName: string) {
        if (playerName !== this.activeGame.organizerName) return;
        this._isDebugMode.set(!this._isDebugMode());
    }

    setActiveGame(id: string): void {
        this.isLoading.set(true);
        this.setActiveGameSubscription?.unsubscribe();
        this.setActiveGameSubscription = this.httpService.get<IActiveGame>(environment.apiUrl + '/activeGame/' + id).subscribe({
            next: (game) => {
                this.activeGame = game;

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
        return this.activeGame.players.find(player => player.name === playerName);
    }

    getPlayersAtPosition(row: number, col: number): ICharacter[] {
        return this.activeGame.players.filter(player =>
            !player.hasAbandoned && player.positionGrille.y === row && player.positionGrille.x === col,
        );
    }

    getCurrentPlayer(): ICharacter {
        return this.activeGame.players[this.currentPlayer()];
    }

    getIndex(row: number, column: number, totalColumns: number): number {
        return row * totalColumns + column;
    }

    leaveActiveGame(playerName: string): Observable<IActiveGame | null> {
        // TODO: remove the player or the game via API or socket

        /* Simple example:

        if (activeGameToUpdate.organizerName === playerName) {
            await activeGame.findByIdAndDelete(activeGameId);
        } else {
            const playerIndex = activeGameToUpdate.players.findIndex((player) => player.name === playerName);
            activeGameToUpdate.players.splice(playerIndex, 1);
        }

        */
        return this.httpService.patch<IActiveGame | null, { activeGameId: string; playerName: string }>(`${environment.apiUrl}/activeGame/leave`, {
            activeGameId: this.activeGame._id,
            playerName,
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
        this.turnStartedSubscription?.unsubscribe();
        this.attackResultSubscription?.unsubscribe();
        this.playerAbandonedSubscription?.unsubscribe();
        this.gameEndedSubscription?.unsubscribe();
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
    }

    updateMovementRange(totalColumns: number, graph: [number, number][][]) {

        const player = this.activeGame.players[this.currentPlayer()];

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


        const player = this.activeGame.players[this.currentPlayer()];

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

        this.socket.emit<IPlayerMoveData, void>('game', SocketEvent.PlayerMove,  moveData );
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
        this.socket.emit<IDebugTeleportData, void>(Namespaces.Game, SocketEvent.DebugTeleport, {
            gameId: this.activeGame._id,
            playerName: player.name,
            target: { x: col, y: row },
        });
    }
}
