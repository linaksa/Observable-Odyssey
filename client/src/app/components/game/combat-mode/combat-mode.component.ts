import { Component, inject } from '@angular/core';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { AttackPosture } from '@common/attackResult';
import { CommonModule } from '@angular/common';
import { ICharacter } from '@common/character';
import { buildAvatarAssetPath } from '@common/constants';

const COMBAT_DURATION = 10;
const HUNDRED_PERCENT = 100;

@Component({
    selector: 'app-combat-mode',
    imports: [CommonModule],
    templateUrl: './combat-mode.component.html',
})
export class CombatModeComponent {
    protected readonly activeGameService: ActiveGameService = inject(ActiveGameService);
    protected readonly turnService = inject(GameTurnService);
    protected readonly localPlayerService = inject(LocalPlayerService);

    protected readonly AttackPosture = AttackPosture;

    selectedMode: AttackPosture | null = null;
    dialogMessage = 'Que ferez-vous ?';

    get timerPercent(): number {
        const left = this.turnService.turnTimeLeftSeconds ?? 0;
        return Math.max(0, (left / COMBAT_DURATION) * HUNDRED_PERCENT);
    }

    selectAction(mode: AttackPosture): void {
        this.selectedMode = mode;
        this.dialogMessage = mode === AttackPosture.Defensive
            ? 'Mode défensif sélectionné...'
            : 'Mode offensif sélectionné...';
    }

    confirmAction(): void {
        if (this.selectedMode === null) return;
        this.activeGameService.chooseAttackMode(this.selectedMode);
        this.dialogMessage = this.selectedMode === AttackPosture.Defensive
            ? 'Posture défensive adoptée !'
            : 'Attaque préparée !';
        this.selectedMode = null;
    }

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
        if (!character) return '';
        return buildAvatarAssetPath(character.avatar, true);
    }
}
