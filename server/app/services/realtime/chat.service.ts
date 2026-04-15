import { IMessage, INewMessage } from '@common/message';
import { SocketEvent } from '@common/socket-events';
import { IJoinChatPayload } from '@common/socket-payloads';
import { Socket } from 'socket.io';
import { Service } from 'typedi';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { GameSessionService } from '@app/services/realtime/game-session.service';

@Service()
export class ChatService {
    constructor(
        private readonly activeGameService: ActiveGameService,
        private readonly gameSessionService: GameSessionService,
    ) {}

    async getMessages(roomId: string): Promise<IMessage[]> {
        return await this.activeGameService.getMessagesFromGame(roomId);
    }

    register(socket: Socket) {
        let newMessageHandler: ((newMessage: INewMessage) => void) | undefined;

        socket.on(SocketEvent.JoinChat, async (payload: string | IJoinChatPayload, callback) => {
            const { roomId, playerName } = this.parseJoinChatPayload(payload);
            socket.join(roomId);
            if (playerName) {
                this.gameSessionService.setSocketPlayerName(socket, roomId, playerName);
            }

            if (newMessageHandler) {
                socket.off(SocketEvent.NewMessage, newMessageHandler);
            }

            newMessageHandler = (newMessage: INewMessage) => {
                this.activeGameService.addMessageToGame(newMessage);

                const message: IMessage = {
                    postedAt: new Date(),
                    content: newMessage.content,
                    author: newMessage.author,
                };

                socket.to(roomId).emit(SocketEvent.NewMessage, message);
            };

            socket.on(SocketEvent.NewMessage, newMessageHandler);

            callback(await this.getMessages(roomId));
        });
    }

    private parseJoinChatPayload(payload: string | IJoinChatPayload): IJoinChatPayload {
        if (typeof payload === 'string') {
            return { roomId: payload };
        }
        return {
            roomId: payload?.roomId ?? '',
            playerName: payload?.playerName,
        };
    }
}
