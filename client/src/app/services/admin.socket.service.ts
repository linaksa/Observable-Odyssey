import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class AdminSocketService {
    socket: Socket;
    private readonly baseUrl: string = environment.serverUrl;

    constructor() {
        this.socket = io(this.baseUrl, { transports: ['websocket'], path: '/ws/admin' });
    }

    disconnect() {
        this.socket.disconnect();
    }

    fetchGamesOnSignal(): Observable<void> {
        return new Observable<void>((observer) => {
            const handler = () => {
                observer.next();
            };
            this.socket.on('new-games', handler);
            return () => this.socket.off('new-games', handler);
        });
    }
}
