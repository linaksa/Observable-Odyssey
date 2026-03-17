import { IMessage, INewMessage } from '@common/message';
import { SocketEvent } from '@common/socket-events';
import { Socket } from 'socket.io';
import { Service } from 'typedi';
import { ActiveGameService } from '@app/services/active-game/active-game.service';

@Service()
export class ChatService {
    constructor(private readonly activeGameService: ActiveGameService) {}

    async getMessages(roomId: string): Promise<IMessage[]> {
        return await this.activeGameService.getMessagesFromGame(roomId);
    }

    register(socket: Socket) {
        let newMessageHandler: ((newMessage: INewMessage) => void) | undefined;

        socket.on(SocketEvent.JoinChat, async (roomId: string, callback) => {
            socket.join(roomId);

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
}
