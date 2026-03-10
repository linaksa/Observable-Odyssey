import { Injectable } from '@angular/core';
import { IActiveGame } from '@common/activeGame';
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

    getOtherPlayers(activeGame: IActiveGame): ICharacter[] {
        if (!activeGame || !activeGame.players) return [];
        if (!this.localPlayer) return [...activeGame.players];
        return activeGame.players.filter((p) => p.name !== this.localPlayer?.name);
    }

    clear(): void {
        this.localPlayer = undefined;
    }
}
