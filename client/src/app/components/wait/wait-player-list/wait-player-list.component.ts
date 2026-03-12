import { CommonModule } from '@angular/common';
import { Component, input, InputSignal } from '@angular/core';
import { ICharacter } from '@common/character';

@Component({
    selector: 'app-wait-player-list',
    imports: [CommonModule],
    templateUrl: './wait-player-list.component.html',
})
export class WaitPlayerListComponent {
    players: InputSignal<ICharacter[]> = input.required<ICharacter[]>();
    localPlayer: InputSignal<ICharacter | undefined> = input<ICharacter | undefined>();
    organizerName: InputSignal<string> = input.required<string>();

    get otherPlayers(): ICharacter[] {
        const localName = this.localPlayer()?.name;
        return this.players().filter((player) => player.name !== localName);
    }

    get canManagePlayers(): boolean {
        const local = this.localPlayer();
        return !!local && this.isOrganizer(local.name);
    }

    isOrganizer(playerName: string): boolean {
        return playerName === this.organizerName();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    kickPlayer(playerName: string): void {
        // TODO: kick the player via API or socket
    }
}
