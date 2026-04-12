import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CharacterFormComponent } from '@app/components/character-form/character-form/character-form.component';
import { ToastComponent } from '@app/components/common/toast/toast.component';
import { JoinFormPageFacadeService } from '@app/services/lobby/join-form-page.facade.service';
import { CharacterFormData } from '@common/character';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-join-form-page',
    imports: [RouterLink, CharacterFormComponent, ToastComponent],
    templateUrl: './join-form-page.component.html',
})
export class JoinFormPageComponent implements OnInit, OnDestroy {
    private readonly facade = inject(JoinFormPageFacadeService);
    route = inject(ActivatedRoute);

    private routeSubscription?: Subscription;
    private socketSubscription?: Subscription;

    activeGameId: string | null = null;

    ngOnInit(): void {
        this.facade.connectToJoinableGamesUpdates();

        this.routeSubscription = this.route.params.subscribe((params) => {
            this.activeGameId = this.facade.resolveActiveGameId(params);
            this.fetchAvailableAvatars();

            this.socketSubscription?.unsubscribe();
            this.socketSubscription = this.facade.onJoinableGamesUpdated().subscribe({
                next: (activeGameId) => {
                    if (this.facade.shouldRefreshAvatars(activeGameId, this.activeGameId)) {
                        this.fetchAvailableAvatars();
                    }
                },
            });
        });
    }

    ngOnDestroy(): void {
        this.routeSubscription?.unsubscribe();
        this.socketSubscription?.unsubscribe();
        this.facade.disconnectFromJoinableGamesUpdates();
    }

    fetchAvailableAvatars(): void {
        if (!this.activeGameId) {
            return;
        }

        this.facade.fetchUnavailableAvatars(this.activeGameId);
    }

    joinGameAsCharacter(characterData: CharacterFormData): void {
        if (!this.activeGameId) {
            this.facade.showMissingGameIdError();
            return;
        }

        this.facade.joinGameAsCharacter(this.activeGameId, characterData);
    }
}
