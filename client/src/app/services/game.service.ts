import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IExistingGame, Visibility } from '@common/game';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class GameService {
    private readonly baseUrl: string = environment.serverUrl;
    gameUnderCreation: IExistingGame;

    constructor(private readonly http: HttpClient) {}

    getAllGames(): Observable<IExistingGame[]> {
        return this.http.get<IExistingGame[]>(`${this.baseUrl}/games`).pipe(catchError(this.handleError<IExistingGame[]>('basicGet')));
    }

    getGameById(gameId: string): Observable<IExistingGame> {
        return this.http.get<IExistingGame>(`${this.baseUrl}/games/${gameId}`).pipe(catchError(this.handleError<IExistingGame>('getGameById')));
    }

    changeGameVisibility(gameId: string, visibility: Visibility): Observable<HttpResponse<string>> {
        return this.http.patch(`${this.baseUrl}/games/${gameId}/visibility`, { visibility }, { observe: 'response', responseType: 'text' });
    }

    saveGame(gameId: string, gameData: Partial<IExistingGame>): Observable<HttpResponse<string>> {
        return this.http.put(`${this.baseUrl}/games/${gameId}`, gameData, { observe: 'response', responseType: 'text' });
    }

    deleteGame(game: IExistingGame): Observable<HttpResponse<string>> {
        return this.http.delete(`${this.baseUrl}/games/${game._id}`, { observe: 'response', responseType: 'text' });
    }

    private handleError<T>(request: string, result?: T): (error: Error) => Observable<T> {
        return () => of(result as T);
    }
}
