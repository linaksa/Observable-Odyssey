import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { ICharacter } from '@common/character';
import { Avatar, buildAvatarAssetPath } from '@common/constants';

@Component({
    selector: 'app-player-list',
    imports: [CommonModule],
    templateUrl: './player-list.component.html',
})
export class PlayerListComponent {
    protected readonly activeGameService = inject(ActiveGameService);

    get orderedPlayers(): ICharacter[] {
        const { players, turnOrder } = this.activeGameService.activeGame;
        const playersByName = new Map(players.map((player) => [player.name, player]));

        return turnOrder.map((playerName) => playersByName.get(playerName)).filter((player): player is ICharacter => Boolean(player));
    }

    get currentPlayerName(): string | undefined {
        const currentPlayerIndex = this.activeGameService.currentPlayer();
        return this.activeGameService.activeGame.turnOrder[currentPlayerIndex];
    }

    buildPlayerAvatarUrl(avatar: Avatar): string {
        return buildAvatarAssetPath(avatar, true);
    }
    hasFlag(player: ICharacter): boolean {
        return this.activeGameService.activeGame.hasFlagId === player.name;
    }
    get organizerName(): string {
        return this.activeGameService.activeGame.organizerName;
    }

    isOrganizer(playerName: string): boolean {
        return playerName === this.organizerName;
    }
}
