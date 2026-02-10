import { HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { HttpClientPort } from '@app/http/http-client-port';
import { HTTP_CLIENT } from '@app/http/http-interface';
import { IExistingGame, Visibility } from '@common/game';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class GameService {
    private readonly baseUrl: string = environment.apiUrl;
    private readonly httpClient: HttpClientPort = inject(HTTP_CLIENT);

    gameUnderCreation: IExistingGame;

    getAllGames(): Observable<IExistingGame[]> {
        return this.httpClient.get<IExistingGame[]>(`${this.baseUrl}/games`).pipe(catchError(this.handleError<IExistingGame[]>('basicGet')));
    }

    getGameById(gameId: string): Observable<IExistingGame> {
        return this.httpClient.get<IExistingGame>(`${this.baseUrl}/games/${gameId}`).pipe(catchError(this.handleError<IExistingGame>('getGameById')));
    }

    changeGameVisibility(gameId: string, visibility: Visibility): Observable<HttpResponse<string>> {
        return this.httpClient.patch(`${this.baseUrl}/games/${gameId}/visibility`, { visibility }, { responseType: 'text' });
    }

    saveGame(gameId: string, gameData: Partial<IExistingGame>): Observable<HttpResponse<string>> {
        return this.httpClient.put(`${this.baseUrl}/games/${gameId}`, gameData, { responseType: 'text' });
    }

    createGame(gameData: Partial<IExistingGame>): Observable<HttpResponse<string>> {
        return this.httpClient.post(`${this.baseUrl}/games`, { game: gameData }, { responseType: 'text' });
    }

    deleteGame(game: IExistingGame): Observable<HttpResponse<string>> {
        return this.httpClient.delete(`${this.baseUrl}/games/${game._id}`, { responseType: 'text' });
    }

    private handleError<T>(request: string, result?: T): (error: Error) => Observable<T> {
        return () => of(result as T);
    }
}
