import { CommonModule } from '@angular/common';
import { Component, DoCheck, inject, OnInit } from '@angular/core';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { buildAvatarAssetPath } from '@app/utils/avatar-path';
import { AttackPosture } from '@common/attackResult';
import { ICharacter } from '@common/character';

const COMBAT_DURATION = 10;
const HUNDRED_PERCENT = 100;

@Component({
    selector: 'app-combat-mode',
    imports: [CommonModule],
    templateUrl: './combat-mode.component.html',
})
export class CombatModeComponent implements DoCheck, OnInit {
    protected readonly activeGameService: ActiveGameService = inject(ActiveGameService);
    protected readonly turnService = inject(GameTurnService);
    protected readonly localPlayerService = inject(LocalPlayerService);

    protected readonly attackPosture = AttackPosture;

    selectedMode: AttackPosture | null = null;
    dialogMessage = 'Que ferez-vous ?';
    confirmed = false;
    private previousTime = 0;

    get timerPercent(): number {
        const left = this.turnService.turnTimeLeftSeconds ?? 0;
        return Math.max(0, (left / COMBAT_DURATION) * HUNDRED_PERCENT);
    }

    ngOnInit() {
        this.resetSelection();
    }

    ngDoCheck(): void {
        const current = this.turnService.turnTimeLeftSeconds ?? 0;

        if (current > this.previousTime) {
            this.resetSelection();
        }

        this.previousTime = current;
    }

    private resetSelection(): void {
        this.selectedMode = null;
        this.confirmed = false;
        this.dialogMessage = 'Que ferez-vous ?';
    }

    selectAction(mode: AttackPosture): void {
        if (this.confirmed) return;
        this.selectedMode = mode;
        this.dialogMessage = mode === AttackPosture.Defensive ? 'Mode défensif sélectionné...' : 'Mode offensif sélectionné...';
    }

    confirmAction(): void {
        if (this.selectedMode === null || this.confirmed) return;
        this.confirmed = true;
        this.activeGameService.chooseAttackMode(this.selectedMode);
        this.dialogMessage = this.selectedMode === AttackPosture.Defensive ? 'Posture défensive adoptée !' : 'Attaque préparée !';
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
