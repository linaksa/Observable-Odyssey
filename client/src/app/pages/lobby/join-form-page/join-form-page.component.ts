import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CharacterFormComponent } from '@app/components/character-form/character-form/character-form.component';
import { ToastComponent } from '@app/components/common/toast/toast.component';
import { CharacterFormService } from '@app/services/forms/character-form.service';
import { GameService } from '@app/services/admin/game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { ToastService } from '@app/services/ui/toast.service';
import { IActiveGame } from '@common/activeGame';
import { CharacterFormData } from '@common/character';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-join-form-page',
    imports: [RouterLink, CharacterFormComponent, ToastComponent],
    templateUrl: './join-form-page.component.html',
})
export class JoinFormPageComponent implements OnInit, OnDestroy {
    private readonly characterFormService = inject(CharacterFormService);
    private readonly socketService = inject(SocketService);

    private readonly gameService = inject(GameService);
    private readonly toastService = inject(ToastService);
    private readonly localPlayerService = inject(LocalPlayerService);
    private readonly navigator = inject(Router);

    private routeSubscription?: Subscription;
    private socketSubscription?: Subscription;
    private readonly socketNamespace = Namespaces.ActiveGameAdmin;

    router = inject(ActivatedRoute);
    activeGameId: string | null = null;
    activeGame: IActiveGame | null = null;

    ngOnInit(): void {
        this.socketService.connect(this.socketNamespace);

        this.routeSubscription = this.router.params.subscribe((params) => {
            this.activeGameId = params.activeGameId || null;
            this.fetchAvailableAvatars();

            this.socketSubscription?.unsubscribe();
            this.socketSubscription = this.socketService.on<string>(this.socketNamespace, SocketEvent.JoinableGamesUpdated).subscribe({
                next: (activeGameId) => {
                    if (activeGameId === this.activeGameId) {
                        this.fetchAvailableAvatars();
                    }
                },
            });
        });
    }

    ngOnDestroy(): void {
        this.routeSubscription?.unsubscribe();
        this.socketSubscription?.unsubscribe();
    }

    fetchAvailableAvatars(): void {
        if (!this.activeGameId) {
            return;
        }

        this.gameService.getActiveGameById(this.activeGameId).subscribe({
            next: (activeGame) => {
                this.characterFormService.unavailableAvatars.set(activeGame.players.map((player) => player.avatar));
            },
        });
    }

    joinGameAsCharacter(characterData: CharacterFormData): void {
        if (!this.activeGameId) {
            this.toastService.show("L'ID de la partie à rejoindre est manquant.");
            return;
        }

        this.characterFormService.isLoading.set(true);
        this.characterFormService.errors.set(null);

        this.characterFormService.joinActiveGameWithCharacter(this.activeGameId, characterData).subscribe({
            next: (response) => {
                this.characterFormService.isLoading.set(false);

                this.localPlayerService.setLocalPlayer(response.player);
                this.navigator.navigate(['/wait', response.activeGame._id]);
            },
            error: (error) => {
                this.characterFormService.isLoading.set(false);
                this.toastService.show('Erreur lors de la tentative de rejoindre la partie.');
                this.characterFormService.errors.set(error.originalError.error.message || 'Il y a eu un problème lors de la création du personnage.');
            },
        });
    }
}
