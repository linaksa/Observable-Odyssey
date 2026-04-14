import { activeGameModel } from '@app/schemas/active-game';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/active-game';
import { Namespaces } from '@common/namespaces';
import { ISocketData } from '@common/socket-payloads';
import { Service } from 'typedi';

@Service()
export class ActiveGameGarbageCollectorService {
    constructor(
        private readonly activeGameService: ActiveGameService,
        private readonly socketService: SocketService,
    ) {}

    async countConnectedRealPlayers(gameId: string): Promise<number> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) {
            return 0;
        }

        return this.countConnectedRealPlayersForGame(gameId, activeGame);
    }

    async reevaluateFinishedGameMark(gameId: string): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) {
            return;
        }

        if (!activeGame.isFinished) {
            await this.clearDeletionMarkIfNeeded(activeGame);
            return;
        }

        const connectedRealPlayers = this.countConnectedRealPlayersForGame(gameId, activeGame);
        if (connectedRealPlayers === 0) {
            await this.markDeletionIfNeeded(activeGame);
            return;
        }

        await this.clearDeletionMarkIfNeeded(activeGame);
    }

    async sweepMarkedGames(gracePeriodMs: number): Promise<number> {
        const normalizedGracePeriodMs = Math.max(gracePeriodMs, 0);
        const cutoff = new Date(Date.now() - normalizedGracePeriodMs);
        const deleteResult = await activeGameModel.deleteMany({
            isFinished: true,
            markedForDeletionAt: {
                $ne: null,
                $lte: cutoff,
            },
        });

        return deleteResult.deletedCount ?? 0;
    }

    private countConnectedRealPlayersForGame(gameId: string, activeGame: IActiveGame): number {
        const realPlayerNames = this.extractRealPlayerNames(activeGame);
        if (realPlayerNames.size === 0 || !this.socketService.hasNamespace(Namespaces.Game)) {
            return 0;
        }

        const connectedRealPlayerNames = new Set<string>();
        const gameNamespace = this.socketService.getNamespace(Namespaces.Game);
        gameNamespace.sockets.forEach((socket) => {
            const socketData = socket.data as ISocketData;
            const playerName = socketData.playerNamesByGameId?.[gameId];
            if (!playerName || !realPlayerNames.has(playerName)) {
                return;
            }

            connectedRealPlayerNames.add(playerName);
        });

        return connectedRealPlayerNames.size;
    }

    private extractRealPlayerNames(activeGame: IActiveGame): Set<string> {
        const realPlayerNames = activeGame.players.filter((player) => !player.virtualPlayerProfile).map((player) => player.name);
        return new Set(realPlayerNames);
    }

    private async markDeletionIfNeeded(activeGame: IActiveGame): Promise<void> {
        if (activeGame.markedForDeletionAt) {
            return;
        }

        await this.activeGameService.saveActiveGameById(activeGame._id.toString(), { markedForDeletionAt: new Date() });
    }

    private async clearDeletionMarkIfNeeded(activeGame: IActiveGame): Promise<void> {
        if (!activeGame.markedForDeletionAt) {
            return;
        }

        await this.activeGameService.saveActiveGameById(activeGame._id.toString(), { markedForDeletionAt: null });
    }
}
