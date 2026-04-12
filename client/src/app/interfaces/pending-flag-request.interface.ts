import { SocketEvent } from '@common/socket-events';
import { IFlagActionData } from '@common/socket-payloads';

export interface PendingFlagRequest {
    data: IFlagActionData;
    acceptEvent: SocketEvent.TakeFlag | SocketEvent.GiveFlag;
    question: string;
}
