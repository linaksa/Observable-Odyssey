import { CommonModule } from '@angular/common';
import { Component, inject, input, InputSignal } from '@angular/core';
import { ActiveGameService } from '@app/services/active-game.service';
import { ICharacter } from '@common/character';

@Component({
    selector: 'app-wait-player-list',
    imports: [CommonModule],
    templateUrl: './wait-player-list.component.html',
})
export class WaitPlayerListComponent {
    activeGameService = inject(ActiveGameService);
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

    isOrganizer(playerName: string | undefined): boolean {
        return playerName === this.organizerName();
    }


    kickPlayer(playerName: string): void {
        const localName = this.localPlayer()?.name;
        if (this.isOrganizer(localName)) {
            this.activeGameService.kickPlayer(playerName);
        }

    }
}
