import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { AvatarSelectorComponent } from '@app/components/character-form/avatar-selector/avatar-selector.component';
import { CharacterInfoPanelComponent } from '@app/components/character-form/character-info-panel/character-info-panel.component';
import { CharacterModifierPanelComponent } from '@app/components/character-form/character-modifier-panel/character-modifier-panel.component';
import { CharacterFormService } from '@app/services/forms/character-form.service';
import { CharacterFormData } from '@common/character';
import { Avatar } from '@common/constants';

@Component({
    selector: 'app-character-form',
    imports: [CommonModule, ReactiveFormsModule, AvatarSelectorComponent, CharacterInfoPanelComponent, CharacterModifierPanelComponent],
    templateUrl: './character-form.component.html',
})
export class CharacterFormComponent implements OnInit {
    @Output() submitForm = new EventEmitter<CharacterFormData>();

    protected readonly characterFormService = inject(CharacterFormService);

    ngOnInit() {
        this.characterFormService.initializeForm();
    }

    onFormSubmitted() {
        if (!this.characterFormService.characterForm.valid) return;

        const data: CharacterFormData = {
            name: this.characterFormService.characterForm.controls.playerName.value,
            avatar: this.characterFormService.characterForm.controls.avatar.value as Avatar,
            initialHealth: this.characterFormService.lifePoints,
            rapidityPoints: this.characterFormService.speedPoints,
            attackPoints: this.characterFormService.attackPoints,
            defensePoints: this.characterFormService.defensePoints,
            attackBonusDiceType: this.characterFormService.attackDiceType,
            defenseBonusDiceType: this.characterFormService.defenseDiceType,
        };
        this.submitForm.emit(data);
    }
}
