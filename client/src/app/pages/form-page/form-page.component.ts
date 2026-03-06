import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BackNavigationComponent } from '@app/components/character-form/back-navigation/back-navigation.component';
import { CharacterFormComponent } from '@app/components/character-form/character-form/character-form.component';
import { FormPageHeaderComponent } from '@app/components/character-form/form-page-header/form-page-header.component';
import { ToastComponent } from '@app/components/common/toast/toast.component';
import { CharacterFormService } from '@app/services/character-form.service';
import { LocalPlayerService } from '@app/services/local-player.service';
import { ToastService } from '@app/services/toast.service';
import { CharacterFormData } from '@common/character';

@Component({
    selector: 'app-form-page',
    imports: [FormPageHeaderComponent, BackNavigationComponent, CharacterFormComponent, ToastComponent],
    templateUrl: './form-page.component.html',
})
export class FormPageComponent implements OnInit {
    characterFormService = inject(CharacterFormService);
    toastService = inject(ToastService);
    localPlayerService = inject(LocalPlayerService);

    router = inject(ActivatedRoute);
    navigator = inject(Router);
    gameId: string | null = null;

    ngOnInit(): void {
        this.router.params.subscribe((params) => {
            this.gameId = params.gameId || null;
        });
    }

    submitCharacterForm(formData: CharacterFormData): void {
        if (!this.gameId) {
            this.toastService.show('ID de jeu manquant. Impossible de créer le personnage.');
            return;
        }
        this.characterFormService.isLoading.set(true);

        this.characterFormService.createActiveGameWithCharacter(this.gameId, formData).subscribe({
            next: (response) => {
                this.characterFormService.isLoading.set(false);
                const serverPlayer = response?.players?.find((p) => p.name === formData.name) ?? response?.players?.[0];

                if (serverPlayer) {
                    this.localPlayerService.setLocalPlayer(serverPlayer);
                } else {
                    this.toastService.show('Impossible de créer le personnage.');
                    return;
                }

                this.navigator.navigate(['/wait', response._id]);
            },
            error: (response) => {
                this.characterFormService.isLoading.set(false);
                this.toastService.show(response.originalError.error.message || 'Il y a eu un problème lors de la création du personnage.');
            },
        });
    }
}
