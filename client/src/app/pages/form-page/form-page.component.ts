import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BackNavigationComponent } from '@app/components/character-form/back-navigation/back-navigation.component';
import { CharacterFormComponent } from '@app/components/character-form/character-form/character-form.component';
import { FormPageHeaderComponent } from '@app/components/character-form/form-page-header/form-page-header.component';
import { ToastComponent } from '@app/components/common/toast/toast.component';
import { CharacterFormService } from '@app/services/character-form.service';
import { LocalPlayerService } from '@app/services/local-player.service';
import { ToastService } from '@app/services/toast.service';
import { CharacterFormData } from '@common/character';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-form-page',
    imports: [FormPageHeaderComponent, BackNavigationComponent, CharacterFormComponent, ToastComponent],
    templateUrl: './form-page.component.html',
})
export class FormPageComponent implements OnInit, OnDestroy {
    characterFormService = inject(CharacterFormService);
    toastService = inject(ToastService);
    localPlayerService = inject(LocalPlayerService);

    router = inject(ActivatedRoute);
    navigator = inject(Router);
    gameId: string | null = null;
    private routeSubscription?: Subscription;

    ngOnInit(): void {
        this.routeSubscription = this.router.params.subscribe((params) => {
            this.gameId = params.gameId || null;
        });
    }

    ngOnDestroy(): void {
        this.routeSubscription?.unsubscribe();
    }

    submitCharacterForm(formData: CharacterFormData): void {
        if (!this.gameId) {
            this.toastService.show('ID de jeu manquant. Impossible de créer le personnage.');
            return;
        }
        this.characterFormService.isLoading.set(true);
        this.characterFormService.errors.set(null);

        this.characterFormService.createActiveGameWithCharacter(this.gameId, formData).subscribe({
            next: (response) => {
                this.characterFormService.isLoading.set(false);
                this.localPlayerService.setLocalPlayer(response.player);
                this.navigator.navigate(['/wait', response.activeGame._id]);
            },
            error: (response) => {
                this.characterFormService.isLoading.set(false);
                this.characterFormService.errors.set(
                    response.originalError.error.message || 'Il y a eu un problème lors de la création du personnage.',
                );
            },
        });
    }
}
