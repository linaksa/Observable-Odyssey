import { Component, inject } from '@angular/core';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { AttackPosture } from '@common/attackResult';
import { ICharacter } from '@common/character';
import { LocalPlayerService} from '@app/services/player/local-player.service';

@Component({
    selector: 'app-combat-mode',
    imports: [],
    templateUrl: './combat-mode.component.html',
})
export class CombatModeComponent {
    activeGameService: ActiveGameService = inject(ActiveGameService);
    turnService = inject(GameTurnService);
    localPlayerService = inject(LocalPlayerService);


    get attackerCharacter(): ICharacter | undefined {
        const attackerName = this.activeGameService.activeGame.currentAttack?.attacker;
        return this.activeGameService.activeGame.players.find((player) => player.name === attackerName);
    }

    get defenderCharacter(): ICharacter | undefined {
        const defenderName = this.activeGameService.activeGame.currentAttack?.defender;
        return this.activeGameService.activeGame.players.find((player) => player.name === defenderName);
    }

    getHealthRange(player: ICharacter | undefined) {
        if (!player) return [];
        return new Array(player.initialHealth);
    }

    getFilledBlocks(player: ICharacter | undefined): number {
        if (!player) return 0;
        return Math.floor((player.currentHealth / player.initialHealth) * player.initialHealth);
    }

    getAvatarUrl(character: ICharacter | undefined): string {
        return `assets/form-page/${character?.avatar || ''}.png`;
    }


    protected readonly AttackPosture = AttackPosture;
}
