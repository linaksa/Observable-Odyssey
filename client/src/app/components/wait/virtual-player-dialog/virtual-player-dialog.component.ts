import { Component, inject, OnDestroy, OnInit, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { VirtualPlayerOption } from '@app/interfaces/virtual-player-option.interface';
import { CharacterFormService } from '@app/services/forms/character-form.service';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { VirtualPlayerProfile } from '@common/character';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-virtual-player-dialog',
    imports: [ReactiveFormsModule],
    templateUrl: './virtual-player-dialog.component.html',
})
export class VirtualPlayerDialogComponent implements OnInit, OnDestroy {
    private readonly fb = inject(FormBuilder);
    private readonly characterFormService = inject(CharacterFormService);
    private readonly activeGameService = inject(ActiveGameService);

    private characterFormSubscription?: Subscription;

    closeDialog = output<void>();

    form: FormGroup;

    readonly profileOptions: VirtualPlayerOption[] = [
        {
            value: VirtualPlayerProfile.Agressive,
            label: 'Agressif',
            description: 'Le joueur ne va pas fuir le combat et choisit systématiquement une posture offensive',
        },
        {
            value: VirtualPlayerProfile.Defensive,
            label: 'Defensif',
            description: "va tenter d'éviter le combat et choisit systématiquement une posture défensive",
        },
    ];

    private readonly defaultProfile = VirtualPlayerProfile.Agressive;

    ngOnInit() {
        // Initialize form with proper control names and default values
        this.form = this.fb.group({
            profileOption: [this.defaultProfile, Validators.required],
        });
    }

    async createVirtualPlayer() {
        this.characterFormService.createVirtualPlayer(this.form.get('profileOption')?.value, this.activeGameService.activeGame._id).subscribe({
            next: () => {
                this.closeDialog.emit();
            },
        });
    }

    get selectedProfileLabel(): string {
        return this.profileOptions.find((option) => option.value === this.form.get('profileOption')?.value)?.description ?? '';
    }

    ngOnDestroy() {
        this.characterFormSubscription?.unsubscribe();
    }
}
