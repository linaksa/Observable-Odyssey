import { inject, Injectable } from '@angular/core';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { WaitGridService } from '@app/services/lobby/wait-grid.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { ICharacter } from '@common/character';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { IJoinGamePayload } from '@common/socket-payloads';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class WaitPageFacadeService {
    readonly activeGameService = inject(ActiveGameService);
    private readonly waitGridService = inject(WaitGridService);
    private readonly localPlayerService = inject(LocalPlayerService);
    private readonly socketService = inject(SocketService);

    connectAndJoinWaitingRoom(activeGameId: string): void {
        this.socketService.connect(Namespaces.Game);
        this.socketService.emit<IJoinGamePayload, void>(Namespaces.Game, SocketEvent.JoinGame, {
            activeGameId,
            playerName: this.localPlayerService.getLocalPlayer()?.name,
        });
        this.activeGameService.setActiveGame(activeGameId);
    }

    onPlayersUpdated(): Observable<ICharacter[]> {
        return this.socketService.on<ICharacter[]>(Namespaces.Game, SocketEvent.PlayersUpdated);
    }

    onGameStarted(): Observable<string> {
        return this.socketService.on<string>(Namespaces.Game, SocketEvent.GameStarted);
    }

    onGameEnded(): Observable<{ winner: string | null }> {
        return this.socketService.on<{ winner: string | null }>(Namespaces.Game, SocketEvent.GameEnded);
    }

    updatePlayers(players: ICharacter[]): void {
        this.activeGameService.updatePlayers(players);
    }

    initializeGridFromActiveGame(): void {
        const activeGame = this.activeGameService.activeGame;
        if (!activeGame?.game) {
            return;
        }

        this.waitGridService.buildGrid(activeGame.game.board.cells.length);
        this.waitGridService.initFromExistingBoard(structuredClone(activeGame));
    }

    getLocalPlayer(): ICharacter | undefined {
        return this.localPlayerService.getLocalPlayer();
    }

    clearLocalPlayer(): void {
        this.localPlayerService.clear();
    }

    kickPlayer(playerName: string): void {
        this.activeGameService.kickPlayer(playerName);
    }

    leaveWaitingRoom(playerName: string): void {
        this.activeGameService.leaveWaitingRoom(playerName);
    }
}
