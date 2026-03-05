import { inject, Injectable, signal } from '@angular/core';
import { HTTP_CLIENT } from '@app/http/http-client-token';
import { IActiveGame } from '@common/activeGame';
import { ICharacter } from '@common/character';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class ActiveGameService {
    httpService = inject(HTTP_CLIENT);
    playerName: string = 'Player 1';

    activeGame: IActiveGame;

    isLoading = signal(false);

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
