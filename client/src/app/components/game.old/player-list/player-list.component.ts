import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { buildAvatarAssetPath } from '@app/utils/avatar-path';
import { ICharacter, Team } from '@common/character';
import { Avatar } from '@common/constants';
import { GameType } from '@common/game';

@Component({
    selector: 'app-player-list',
    imports: [CommonModule],
    templateUrl: './player-list.component.html',
})
export class PlayerListComponent {
    private readonly activeGameService = inject(ActiveGameService);

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

    get isCtfMode(): boolean {
        return this.activeGameService.activeGame.game.gameMode === GameType.Ctf;
    }

    playerNameColor(player: ICharacter): string {
        if (!this.isCtfMode) return '#ffffff';
        if (player.team === Team.RED) return '#f87171';
        if (player.team === Team.BLUE) return '#60a5fa';
        return '#ffffff';
    }

    get organizerName(): string {
        return this.activeGameService.activeGame.organizerName;
    }

    isOrganizer(playerName: string): boolean {
        return playerName === this.organizerName;
    }
}
