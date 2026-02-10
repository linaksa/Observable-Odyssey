import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class AdminSocketService implements OnDestroy {
    private socket: Socket | null = null;
    private readonly baseUrl: string = environment.serverUrl;
    private connectionCount = 0;

    private ensureConnection(): void {
        if (!this.socket || !this.socket.connected) {
            this.socket = io(this.baseUrl, { transports: ['websocket'], path: '/ws/admin' });
        }
    }

    connect(): void {
        this.connectionCount++;
        this.ensureConnection();
    }

    disconnect(): void {
        this.connectionCount = Math.max(0, this.connectionCount - 1);

        if (this.connectionCount === 0 && this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    fetchGamesOnSignal(): Observable<void> {
        this.ensureConnection();
        return new Observable<void>((observer) => {
            if (!this.socket) {
                observer.error(new Error('Socket not connected'));
                return;
            }

            const handler = () => {
                observer.next();
            };
            this.socket.on('new-games', handler);
            return () => {
                if (this.socket) {
                    this.socket.off('new-games', handler);
                }
            };
        });
    }

    ngOnDestroy(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}
