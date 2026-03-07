import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService {
    private connectionCount = 0;
    private namespaces: Map<string, Socket> = new Map();

    isConnected(namespace: string = ''): boolean {
        return this.namespaces.get(namespace)?.connected ?? false;
    }

    connect(namespace: string = ''): Socket {
        let socket = this.namespaces.get(namespace);
        if (!socket) {
            socket = io(environment.serverUrl + '/' + namespace, {
                transports: ['websocket'],
                path: '/ws',
            });

            this.namespaces.set(namespace, socket);
        }

        this.connectionCount++;
        return socket;
    }

    disconnect(namespace: string = ''): void {
        if (!this.isConnected(namespace)) return;
        this.namespaces.get(namespace)?.disconnect();
        this.namespaces.delete(namespace);
    }

    on<T>(namespace: string, event: string): Observable<T> {
        const socket = this.namespaces.get(namespace);
        return new Observable<T>((observer) => {
            if (!socket) {
                observer.error(new Error('Socket not connected'));
                return;
            }

            const handler = (eventData: T) => {
                observer.next(eventData);
            };
            socket.on(event, handler);
            return () => {
                if (socket) {
                    socket.off(event, handler);
                }
            };
        });
    }

    emit<T, U>(namespace: string, event: string, data: T, callback?: (response: U) => void): void {
        this.namespaces.get(namespace)?.emit(event, data, callback);
    }

    emitMany(namespace: string, event: string, ...args: unknown[]): void {
        this.namespaces.get(namespace)?.emit(event, ...args);
    }
}
