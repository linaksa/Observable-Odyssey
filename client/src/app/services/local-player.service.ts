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

    getKnownPlayerName(): string | undefined {
        return this.localPlayer?.name ?? this.storedName;
    }

    restoreFromActiveGame(activeGame: IActiveGame | undefined): void {
        if (!activeGame || !activeGame.players) {
            return;
        }

        const nameToRestore = this.localPlayer?.name ?? this.storedName;
        if (!nameToRestore) return;

        const match = activeGame.players.find((p) => p.name === nameToRestore);

        if (match) {
            this.localPlayer = match;
            this.storedName = match.name;
            try {
                sessionStorage.setItem(this.storageKey, match.name);
            } catch {
                // ignore
            }
        } else {
            this.clear();
        }
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
