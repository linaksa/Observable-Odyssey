import { inject, Injectable, signal } from '@angular/core';
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
import { IAttackData, IPlayerMoveData } from '@common/socket-payloads';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class ActiveGameService {
    timeService: TimeService = inject(TimeService);

    httpService = inject(HTTP_CLIENT);
    socket = inject(SocketService);

    activeGame: IActiveGame;

    isLoading = signal(false);

    private _isDebugMode = signal(false);

    isDebugMode = this._isDebugMode.asReadonly();

    hasChangedLocation = signal(false);

    attackMode = signal(false);

    constructor() {
        this.socket.connect(Namespaces.Game);

        this.socket.on<PlayerMovedResult>(Namespaces.Game, SocketEvent.PlayerMoved).subscribe((playerMove) => {
            const player = this.getPlayerByName(playerMove.playerId);
            if (!player) return;

            player.positionGrille.x = playerMove.newPosition.x;
            player.positionGrille.y = playerMove.newPosition.y;
            player.movementLeft = playerMove.movementLeft;

            this.hasChangedLocation.set(!this.hasChangedLocation());
        });

        this.socket.on<{ player: string; movementLeft: number }>(Namespaces.Game, SocketEvent.TurnStarted).subscribe((data) => {
            const index = this.activeGame.players.findIndex((p) => p.name === data.player);

            if (index !== -1) {
                this.activeGame.players[index].movementLeft = data.movementLeft;
                this.activeGame.currentPlayerIndex = index;
                this.currentPlayer.set(index);
                this.hasChangedLocation.set(!this.hasChangedLocation());
            }
        });

        this.socket.on<AttackResult>(Namespaces.Game, SocketEvent.AttackResult).subscribe((data) => {
            const defender = this.getPlayerByName(data.defenderName);
            if (!defender) return;

            defender.positionGrille.x = data.defenderNewPosition.x;
            defender.positionGrille.y = data.defenderNewPosition.y;

            this.hasChangedLocation.set(!this.hasChangedLocation());
        });

        this.socket.on<{ winner: string }>(Namespaces.Game, SocketEvent.GameEnded).subscribe((data) => {
            this.activeGame.winner = data.winner;
            this.activeGame.isFinished = true;
        });
    }

    toggleDebugMode(playerName: string) {
        if (playerName !== this.activeGame.organizerName) return;
        this._isDebugMode.set(!this._isDebugMode());
    }

    setActiveGame(id: string): void {
        this.isLoading.set(true);
        this.httpService.get<IActiveGame>(environment.apiUrl + '/activeGame/' + id).subscribe({
            next: (game) => {
                this.activeGame = game;

                this.socket.emit(Namespaces.Game, SocketEvent.JoinGame, game._id);
            },
            complete: () => {
                this.isLoading.set(false);
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
            if (distances[i] <= player.rapidityPoints) {
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

        this.socket.emit<IPlayerMoveData, void>('game', SocketEvent.PlayerMove, {
            gameId: this.activeGame._id,
            playerId: player.name,
            direction: {
                x: newCol,
                y: newRow,
            },
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

        this.socket.emit<IAttackData, void>(Namespaces.Game, SocketEvent.Attack, {
            gameId: this.activeGame._id,
            attackerName: attacker.name,
            defenderName: target.name,
        });

        this.attackMode.set(false);
    }
}
