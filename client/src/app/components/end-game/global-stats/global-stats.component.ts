import { Component, inject, Input } from '@angular/core';
import { GlobalStatsService } from '@app/services/end/global-stats.service';
import { IActiveGame } from '@common/active-game';
import { HUNDRED_PERCENT, MILLISECONDS_PER_SECOND, SECONDS_PER_MINUTE } from '@common/constants';
import { ItemType } from '@common/items';

@Component({
    selector: 'app-global-stats',
    imports: [],
    templateUrl: './global-stats.component.html',
})
export class GlobalStatsComponent {
    private readonly globalStatsService = inject(GlobalStatsService);

    @Input() activeGame: IActiveGame;

    get gameDurationFormatted(): string {
        const endedAt = this.parseDate(this.activeGame?.endedAt);
        const startedAt = this.parseDate(this.activeGame?.startedAt) ?? this.parseDate(this.activeGame?.createdAt);
        if (!endedAt || !startedAt) {
            return this.formatDuration(0);
        }

        const durationMs = endedAt.getTime() - startedAt.getTime();
        return this.formatDuration(durationMs);
    }

    get totalTurnCount(): number {
        return this.activeGame.totalTurnCount ?? 0;
    }

    get sanctuaryUsageApplicable(): boolean {
        return this.globalStatsService.getTotalSanctuaryCount(this.activeGame) > 0;
    }

    get sanctuaryUsageFormatted(): string {
        if (!this.sanctuaryUsageApplicable) {
            return 'N/A';
        }

        const usedSanctuaries = new Set(this.activeGame.usedSanctuaries ?? []);
        const totalSanctuaries = this.globalStatsService.getTotalSanctuaryCount(this.activeGame);
        return this.formatPercent((usedSanctuaries.size / totalSanctuaries) * HUNDRED_PERCENT);
    }

    get visitedTerrainFormatted(): string {
        const totalTerrainTiles = this.globalStatsService.getTotalTerrainTileCount(this.activeGame);
        if (totalTerrainTiles <= 0) {
            return '0%';
        }

        const visitedTerrainTiles = this.globalStatsService.getVisitedTerrainTileCount(this.activeGame);
        return this.formatPercent((visitedTerrainTiles / totalTerrainTiles) * HUNDRED_PERCENT);
    }

    get doorManipulationApplicable(): boolean {
        return this.globalStatsService.getTotalDoorCount(this.activeGame) > 0;
    }

    get doorManipulationFormatted(): string {
        if (!this.doorManipulationApplicable) {
            return 'N/A';
        }

        const manipulatedDoors = new Set(this.activeGame.manipulatedDoors ?? []);
        const totalDoors = this.globalStatsService.getTotalDoorCount(this.activeGame);
        return this.formatPercent((manipulatedDoors.size / totalDoors) * HUNDRED_PERCENT);
    }

    get flagHolderApplicable(): boolean {
        return this.activeGame.game.board.items.some((item) => item.itemType === ItemType.Flag);
    }

    get flagHolderCount(): number | null {
        if (!this.flagHolderApplicable) {
            return null;
        }

        const holders = new Set(this.activeGame.flagHolderHistory ?? []);
        return holders.size;
    }

    private parseDate(value: Date | null | undefined): Date | null {
        if (!value) {
            return null;
        }

        const parsed = value instanceof Date ? value : new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    private formatDuration(durationMs: number): string {
        const totalSeconds = Math.floor(durationMs / MILLISECONDS_PER_SECOND);
        const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
        const seconds = totalSeconds % SECONDS_PER_MINUTE;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    private formatPercent(value: number): string {
        return `${value.toFixed(1)}%`;
    }
}
