import { Injectable } from '@angular/core';
import { ICharacter } from '@common/character';

@Injectable({
    providedIn: 'root',
})
export class LocalPlayerService {
    private localPlayer?: ICharacter;

    setLocalPlayer(player: ICharacter): void {
        this.localPlayer = player;
    }

    getLocalPlayer(): ICharacter | undefined {
        return this.localPlayer;
    }

    clear(): void {
        this.localPlayer = undefined;
    }
}
