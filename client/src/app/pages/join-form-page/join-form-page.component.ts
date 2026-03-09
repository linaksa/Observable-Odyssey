import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CharacterFormComponent } from '@app/components/character-form/character-form/character-form.component';
import { ToastComponent } from '@app/components/common/toast/toast.component';
import { CharacterFormService } from '@app/services/character-form.service';
import { LocalPlayerService } from '@app/services/local-player.service';
import { ToastService } from '@app/services/toast.service';
import { CharacterFormData } from '@common/character';

@Component({
    selector: 'app-join-form-page',
    imports: [RouterLink, CharacterFormComponent, ToastComponent],
    templateUrl: './join-form-page.component.html',
})
export class JoinFormPageComponent implements OnInit {
    private readonly characterFormService = inject(CharacterFormService);
    private readonly toastService = inject(ToastService);
    private readonly localPlayerService = inject(LocalPlayerService);
    private readonly navigator = inject(Router);

    router = inject(ActivatedRoute);
    activeGameId: string | null = null;

    ngOnInit(): void {
        this.router.params.subscribe((params) => {
            this.activeGameId = params.activeGameId || null;
        });
    }

    joinGameAsCharacter(characterData: CharacterFormData): void {
        if (!this.activeGameId) {
            this.toastService.show("L'ID de la partie à rejoindre est manquant.");
            return;
        }
        this.characterFormService.joinActiveGameWithCharacter(this.activeGameId, characterData).subscribe({
            next: (activeGame) => {
                this.toastService.show('Vous avez rejoint la partie avec succès.');
                const serverPlayer = activeGame?.players?.find((p) => p.name === characterData.name) ?? activeGame?.players?.[0];

                if (serverPlayer) {
                    this.localPlayerService.setLocalPlayer(serverPlayer);
                } else {
                    this.toastService.show('Impossible de rejoindre la partie.');
                    return;
                }

                this.navigator.navigate(['/wait', activeGame._id]);
            },
            error: () => {
                this.toastService.show('Erreur lors de la tentative de rejoindre la partie.');
            },
        });
    }
}
