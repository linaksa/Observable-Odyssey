import { HttpResponse } from '@angular/common/http';
import { ErrorHandler, inject, Injectable } from '@angular/core';
import { HttpClientPort } from '@app/http/http-client-port';
import { HTTP_CLIENT } from '@app/http/http-interface';
import { ResponseType } from '@app/http/http-model';
import { IActiveGame } from '@common/active-game';
import { IExistingGame, Visibility } from '@common/game';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class GameService {
    private readonly baseUrl: string = environment.apiUrl;
    private readonly gamesUrl = `${this.baseUrl}/games`;
    private readonly activeGamesUrl = `${this.baseUrl}/activeGame`;
    private readonly errorHandler = inject(ErrorHandler);
    private readonly httpClient: HttpClientPort = inject(HTTP_CLIENT);

    gameUnderCreation?: IExistingGame;

    getAllGames(): Observable<IExistingGame[]> {
        return this.httpClient.get<IExistingGame[]>(this.gamesUrl).pipe(catchError(this.handleError<IExistingGame[]>('getAllGames', [])));
    }

    getGameById(gameId: string): Observable<IExistingGame> {
        return this.httpClient.get<IExistingGame>(`${this.gamesUrl}/${gameId}`).pipe(catchError(this.handleError<IExistingGame>('getGameById')));
    }

    getActiveGameById(activeGameId: string): Observable<IActiveGame> {
        return this.httpClient
            .get<IActiveGame>(`${this.activeGamesUrl}/${activeGameId}`)
            .pipe(catchError(this.handleError<IActiveGame>('getActiveGameById')));
    }

    changeGameVisibility(gameId: string, visibility: Visibility): Observable<HttpResponse<string>> {
        return this.httpClient.patch(`${this.gamesUrl}/${gameId}/visibility`, { visibility }, { responseType: ResponseType.Text });
    }

    saveGame(gameId: string, gameData: Partial<IExistingGame>): Observable<HttpResponse<string>> {
        return this.httpClient.put(`${this.gamesUrl}/${gameId}`, gameData, { responseType: ResponseType.Text });
    }

    createGame(gameData: Partial<IExistingGame>): Observable<HttpResponse<string>> {
        return this.httpClient.post(this.gamesUrl, { game: gameData }, { responseType: ResponseType.Text });
    }

    deleteGame(game: IExistingGame): Observable<HttpResponse<string>> {
        return this.httpClient.delete(`${this.gamesUrl}/${game._id}`, { responseType: ResponseType.Text });
    }

    fetchJoinableActiveGames(): Observable<IActiveGame[]> {
        return this.httpClient
            .get<IActiveGame[]>(`${this.activeGamesUrl}/joinable`)
            .pipe(catchError(this.handleError<IActiveGame[]>('fetchJoinableActiveGames', [])));
    }

    private handleError<T>(request: string, fallback?: T): (error: unknown) => Observable<T> {
        return (error: unknown) => {
            this.errorHandler.handleError(error);
            return of(fallback as T);
        };
    }
}
