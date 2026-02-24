export interface IMessage {
    author: string;
    content: string;
    postedAt: Date;
}

export interface INewMessage {
    roomId: string;
    author: string;
    content: string;
}
