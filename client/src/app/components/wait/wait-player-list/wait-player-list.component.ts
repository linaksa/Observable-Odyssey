import { CommonModule } from '@angular/common';
import { Component, inject, input, InputSignal, output } from '@angular/core';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { buildAvatarAssetPath } from '@app/utils/avatar-path';
import { ICharacter } from '@common/character';
import { Avatar } from '@common/constants';

@Component({
    selector: 'app-wait-player-list',
    imports: [CommonModule],
    templateUrl: './wait-player-list.component.html',
})
export class WaitPlayerListComponent {
    private readonly activeGameService = inject(ActiveGameService);
    players: InputSignal<ICharacter[]> = input.required<ICharacter[]>();
    localPlayer: InputSignal<ICharacter | undefined> = input<ICharacter | undefined>();
    organizerName: InputSignal<string> = input.required<string>();
    openVirtualPlayerDialog = output<void>();

    get otherPlayers(): ICharacter[] {
        const localName = this.localPlayer()?.name;
        return this.players().filter((player) => player.name !== localName);
    }

    get canManagePlayers(): boolean {
        const local = this.localPlayer();
        return !!local && this.isOrganizer(local.name);
    }

    get canAddVirtualPlayer(): boolean {
        return this.isOrganizer(this.localPlayer()?.name) && this.players().length < (this.activeGameService.activeGame?.maxPlayerCount ?? 0);
    }

    isOrganizer(playerName: string | undefined): boolean {
        return playerName === this.organizerName();
    }

    buildPlayerAvatarUrl(avatar: Avatar): string {
        return buildAvatarAssetPath(avatar, true);
    }

    kickPlayer(playerName: string): void {
        const localName = this.localPlayer()?.name;
        if (this.isOrganizer(localName)) {
            this.activeGameService.kickPlayer(playerName);
        }
    }

    emitOpenVirtualPlayerDialog() {
        this.openVirtualPlayerDialog.emit();
    }
}
