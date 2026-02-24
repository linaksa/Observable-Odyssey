import { inject, Injectable } from '@angular/core';
import { HTTP_CLIENT, HttpClientPort } from '@app/http/http-interface';
import { IActiveGame } from '@common/activeGame';
import { CharacterFormData } from '@common/character';
import { Observable } from 'rxjs/internal/Observable';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CharacterFormService {
  private readonly httpClient: HttpClientPort = inject(HTTP_CLIENT);
  private readonly baseUrl: string = environment.apiUrl;

  createActiveGameWithCharacter(gameId: string, characterData: CharacterFormData): Observable<IActiveGame> {
    // Logic to create an active game with the provided character data
    return this.httpClient.post(`${this.baseUrl}/activeGame/`, { gameId, characterForm: characterData }, { responseType: 'text' });
  }

  joinActiveGameWithCharacter(activeGameId: string, characterData: CharacterFormData): Observable<IActiveGame> {
    return this.httpClient.patch(`${this.baseUrl}/activeGame/join`, { activeGameId, characterForm: characterData }, { responseType: 'text' });
  }
}
