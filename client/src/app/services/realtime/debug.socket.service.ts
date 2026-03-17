import { inject, Injectable, OnDestroy } from '@angular/core';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { IDebugToggleState } from '@common/socket-payloads';
import { Observable, Subscription } from 'rxjs';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { SocketService } from './socket.service';

@Injectable({
    providedIn: 'root',
})
export class DebugSocketService implements OnDestroy {
    private readonly socketService = inject(SocketService);
    private readonly activeGameService = inject(ActiveGameService);
    private debugSubscription?: Subscription;

    connect() {
        if (!this.socketService.isConnected(Namespaces.Game)) {
            this.socketService.connect(Namespaces.Game);
        }

        this.debugSubscription?.unsubscribe();
        this.debugSubscription = this.onDebugModeToggle().subscribe({
            next: (data) => {
                this.activeGameService.applyDebugModeState(data);
            },
        });
    }

    private onDebugModeToggle(): Observable<IDebugToggleState> {
        return this.socketService.on<IDebugToggleState>(Namespaces.Game, SocketEvent.DebugToggle);
    }

    emitDebugModeToggle(playerName: string, activeGameId: string) {
        this.socketService.emitMany(Namespaces.Game, SocketEvent.DebugToggle, playerName, activeGameId);
    }

    ngOnDestroy(): void {
        this.socketService.disconnect(Namespaces.Game);
        this.debugSubscription?.unsubscribe();
    }
}
