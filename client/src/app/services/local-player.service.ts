import { Injectable } from '@angular/core';
import { IActiveGame } from '@common/activeGame';
import { ICharacter } from '@common/character';

@Injectable({
    providedIn: 'root',
})
export class LocalPlayerService {
    private localPlayer?: ICharacter;
    private storedName?: string;
    private readonly storageKey = 'localPlayer';

    constructor() {
        try {
            const raw = sessionStorage.getItem(this.storageKey);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    if (typeof parsed === 'string') this.storedName = parsed;
                    else if (parsed && typeof parsed.name === 'string') this.storedName = parsed.name;
                    else this.storedName = raw;
                } catch {
                    this.storedName = raw;
                }
            }
        } catch {
            this.storedName = undefined;
        }
    }

    setLocalPlayer(player: ICharacter): void {
        this.localPlayer = player;
        this.storedName = player.name;

        try {
            sessionStorage.setItem(this.storageKey, player.name);
        } catch {
            // ignore
        }
    }

    getLocalPlayer(): ICharacter | undefined {
        return this.localPlayer;
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
        this.storedName = undefined;
        try {
            sessionStorage.removeItem(this.storageKey);
        } catch {
            // ignore
        }
    }
}
