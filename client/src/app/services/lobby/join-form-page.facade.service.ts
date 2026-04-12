import { inject, Injectable } from '@angular/core';
import { CharacterFormService } from '@app/services/forms/character-form.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { ToastService } from '@app/services/ui/toast.service';
import { extractErrorCodes, mapErrorCodesToMessage } from '@app/utils/error-codes';
import { CharacterFormData } from '@common/character';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Router } from '@angular/router';
import { GameService } from '@app/services/admin/game.service';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class JoinFormPageFacadeService {
    private readonly characterFormService = inject(CharacterFormService);
    private readonly socketService = inject(SocketService);
    private readonly gameService = inject(GameService);
    private readonly toastService = inject(ToastService);
    private readonly localPlayerService = inject(LocalPlayerService);
    private readonly router = inject(Router);

    connectToJoinableGamesUpdates(): void {
        this.socketService.connect(Namespaces.ActiveGameAdmin);
    }

    disconnectFromJoinableGamesUpdates(): void {
        this.socketService.disconnect(Namespaces.ActiveGameAdmin);
    }

    onJoinableGamesUpdated(): Observable<string> {
        return this.socketService.on<string>(Namespaces.ActiveGameAdmin, SocketEvent.JoinableGamesUpdated);
    }

    resolveActiveGameId(routeParams: Record<string, string | undefined>): string | null {
        return routeParams.activeGameId ?? null;
    }

    shouldRefreshAvatars(updatedGameId: string, activeGameId: string | null): boolean {
        return !!activeGameId && updatedGameId === activeGameId;
    }

    fetchUnavailableAvatars(activeGameId: string): void {
        this.gameService.getActiveGameById(activeGameId).subscribe({
            next: (activeGame) => {
                this.characterFormService.unavailableAvatars.set(
                    activeGame.players.filter((player) => !player.hasAbandoned).map((player) => player.avatar),
                );
            },
        });
    }

    joinGameAsCharacter(activeGameId: string, characterData: CharacterFormData): void {
        this.characterFormService.isLoading.set(true);
        this.characterFormService.errors.set(null);

        this.characterFormService.joinActiveGameWithCharacter(activeGameId, characterData).subscribe({
            next: (response) => {
                this.characterFormService.isLoading.set(false);
                this.localPlayerService.setLocalPlayer(response.player);
                this.router.navigate(['/wait', response.activeGame._id]);
            },
            error: (error) => {
                this.characterFormService.isLoading.set(false);
                this.toastService.show('Erreur lors de la tentative de rejoindre la partie.');
                this.characterFormService.errors.set(
                    mapErrorCodesToMessage(extractErrorCodes(error), 'Il y a eu un problème lors de la création du personnage.'),
                );
            },
        });
    }

    showMissingGameIdError(): void {
        this.toastService.show("L'ID de la partie à rejoindre est manquant.");
    }
}
