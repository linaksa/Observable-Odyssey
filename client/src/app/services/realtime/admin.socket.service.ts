import { inject, Injectable, OnDestroy } from '@angular/core';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Observable } from 'rxjs';
import { SocketService } from '@app/services/realtime/socket.service';

@Injectable({
    providedIn: 'root',
})
export class AdminSocketService implements OnDestroy {
    private connectionCount = 0;

    private readonly socketService = inject(SocketService);
    private readonly socketNamespace = Namespaces.Admin;

    private ensureConnection() {
        if (!this.socketService.isConnected(this.socketNamespace)) {
            this.socketService.connect(this.socketNamespace);
        }
    }

    connect(): void {
        this.connectionCount++;
        this.ensureConnection();
    }

    disconnect(): void {
        this.connectionCount = Math.max(0, this.connectionCount - 1);

        if (this.connectionCount === 0 && this.socketService.isConnected(this.socketNamespace)) {
            this.socketService.disconnect(this.socketNamespace);
        }
    }

    onGamesModified(): Observable<void> {
        this.ensureConnection();
        return this.socketService.on(this.socketNamespace, SocketEvent.GameModified);
    }

    ngOnDestroy(): void {
        this.socketService.disconnect(this.socketNamespace);
    }
}
