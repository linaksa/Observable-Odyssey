import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { BLUE_TEAM_PLAYER_NAME_COLOR, DEFAULT_PLAYER_NAME_COLOR, RED_TEAM_PLAYER_NAME_COLOR } from '@app/constants/player-info';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { buildAvatarAssetPath } from '@app/utils/avatar-path';
import { ICharacter, Team } from '@common/character';
import { Avatar } from '@common/constants';
import { GameType } from '@common/game';

@Component({
    selector: 'app-game-player-list',
    imports: [NgOptimizedImage],
    templateUrl: './game-player-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamePlayerListComponent {
    private readonly activeGameService = inject(ActiveGameService);

    protected readonly orderedPlayers = computed<ICharacter[]>(() => {
        this.activeGameService.hasChangedLocation();
        this.activeGameService.hasAbandoned();
        this.activeGameService.gameHasEnded();

        const activeGame = this.activeGameService.activeGame;
        if (!activeGame) {
            return [];
        }

        const playersByName = new Map(activeGame.players.map((player) => [player.name, player]));
        return activeGame.turnOrder.map((name) => playersByName.get(name)).filter((player): player is ICharacter => Boolean(player));
    });

    protected readonly currentPlayerName = computed<string | undefined>(() => {
        this.activeGameService.hasChangedLocation();
        this.activeGameService.hasAbandoned();
        this.activeGameService.gameHasEnded();

        const activeGame = this.activeGameService.activeGame;
        if (!activeGame?.turnOrder.length) {
            return undefined;
        }

        return activeGame.turnOrder[this.activeGameService.currentPlayer()];
    });

    protected readonly remainingPlayersCount = computed<number>(() => this.orderedPlayers().filter((player) => !player.hasAbandoned).length);

    protected readonly playerCountLabel = computed<string>(() => {
        const totalPlayers = this.orderedPlayers().length;
        const remainingPlayers = this.remainingPlayersCount();
        return `${remainingPlayers} restant${remainingPlayers > 1 ? 's' : ''} / ${totalPlayers}`;
    });

    protected buildPlayerAvatarUrl(avatar: Avatar): string {
        return buildAvatarAssetPath(avatar, true);
    }

    protected isCurrentTurn(playerName: string): boolean {
        return this.currentPlayerName() === playerName;
    }

    protected hasFlag(player: ICharacter): boolean {
        return this.activeGameService.activeGame?.hasFlagId === player.name;
    }

    protected isOrganizer(playerName: string): boolean {
        return playerName === this.activeGameService.activeGame?.organizerName;
    }

    protected playerNameColor(player: ICharacter): string {
        if (this.activeGameService.activeGame?.game.gameMode !== GameType.Ctf) {
            return DEFAULT_PLAYER_NAME_COLOR;
        }

        if (player.team === Team.RED) {
            return RED_TEAM_PLAYER_NAME_COLOR;
        }

        if (player.team === Team.BLUE) {
            return BLUE_TEAM_PLAYER_NAME_COLOR;
        }

        return DEFAULT_PLAYER_NAME_COLOR;
    }
}
