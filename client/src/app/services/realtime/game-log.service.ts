import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { IGameLogPayload } from '@common/socket-payloads';
import { Subscription } from 'rxjs';
import { SocketService } from '@app/services/realtime/socket.service';

@Injectable({
    providedIn: 'root',
})
export class GameLogService implements OnDestroy {
    private readonly socketService = inject(SocketService);
    private readonly _gameLogs = signal<IGameLogPayload[]>([]);

    private gameLogSubscription?: Subscription;
    private gameLogPrivateSubscription?: Subscription;

    readonly gameLogs = this._gameLogs.asReadonly();

    connect(): void {
        this.socketService.connect(Namespaces.Game);
        this.disconnect();

        this.gameLogSubscription = this.socketService.on<IGameLogPayload>(Namespaces.Game, SocketEvent.GameLog).subscribe({
            next: (log) => this.addLog(log),
        });

        this.gameLogPrivateSubscription = this.socketService.on<IGameLogPayload>(Namespaces.Game, SocketEvent.GameLogPrivate).subscribe({
            next: (log) => this.addLog(log),
        });
    }

    clear(): void {
        this._gameLogs.set([]);
    }

    disconnect(): void {
        this.unsubscribeFromLogEvents();
    }

    ngOnDestroy(): void {
        this.disconnect();
    }

    private addLog(log: IGameLogPayload): void {
        this._gameLogs.update((currentLogs) => [...currentLogs, log]);
    }

    private unsubscribeFromLogEvents(): void {
        this.gameLogSubscription?.unsubscribe();
        this.gameLogSubscription = undefined;
        this.gameLogPrivateSubscription?.unsubscribe();
        this.gameLogPrivateSubscription = undefined;
    }
}
