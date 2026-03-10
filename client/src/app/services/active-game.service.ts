import { inject, Injectable, signal } from '@angular/core';
import { HTTP_CLIENT } from '@app/http/http-client-token';
import { IActiveGame } from '@common/activeGame';
import { ICharacter } from '@common/character';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class ActiveGameService {
    httpService = inject(HTTP_CLIENT);

    activeGame: IActiveGame;

    isLoading = signal(false);

    private _isDebugMode = signal(false);

    isDebugMode = this._isDebugMode.asReadonly();

    toggleDebugMode(playerName: string) {
        if (playerName !== this.activeGame.organizerName) return;
        this._isDebugMode.set(!this._isDebugMode());
    }

    setActiveGame(id: string): void {
        this.isLoading.set(true);
        this.httpService.get<IActiveGame>(environment.apiUrl + '/activeGame/' + id).subscribe({
            next: (game) => {
                this.activeGame = game;
            },
            complete: () => {
                this.isLoading.set(false);
            },
        });
    }

    getPlayerByName(playerName: string): ICharacter | undefined {
        return this.activeGame.players.find((player) => player.name === playerName);
    }

    leaveActiveGame(playerName: string): Observable<IActiveGame | null> {
        // TODO : supprimer le player ou la partie via api ou socket

        /* Exemple simple :

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
}
