import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, input, InputSignal, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { GameGridComponent } from '@app/components/common/game-grid/game-grid.component';
import { LoadingOverlayComponent } from '@app/components/common/loading-overlay/loading-overlay.component';
import {
    GAME_TABLE_TOOLTIP_FALLBACK_WIDTH_PX,
    TOOLTIP_FALLBACK_HEIGHT_PX,
    TOOLTIP_HORIZONTAL_OFFSET_PX,
    TOOLTIP_VERTICAL_OFFSET_PX,
} from '@app/constants/tooltip';
import { BoardSharedService } from '@app/services/shared/board-shared.service';
import { computeTooltipPosition, TooltipPosition } from '@app/utils/tooltip-position.utils';
import { IActiveGame } from '@common/active-game';
import { IExistingGame, IGame } from '@common/game';
import { IItem } from '@common/items';

type GameTableRow = IExistingGame | IActiveGame;

@Component({
    selector: 'app-game-table',
    imports: [CommonModule, GameGridComponent, LoadingOverlayComponent],
    templateUrl: './game-table.component.html',
})
export class GameTableComponent implements OnInit {
    @ViewChild('tableContainer') private tableContainerRef?: ElementRef<HTMLDivElement>;
    @ViewChild('descriptionTooltipElement') private descriptionTooltipRef?: ElementRef<HTMLDivElement>;

    private readonly boardSharedService = inject(BoardSharedService);
    private readonly boardObjectLookupCache = new WeakMap<IGame, (rowIndex: number, colIndex: number) => IItem | null>();

    readonly games: InputSignal<IExistingGame[] | undefined> = input<IExistingGame[] | undefined>();
    readonly activeGames: InputSignal<IActiveGame[] | undefined> = input<IActiveGame[] | undefined>();

    readonly emptyString: InputSignal<string> = input<string>('Aucun jeu');
    readonly loadingString: InputSignal<string> = input<string>('Chargement des jeux...');

    readonly isLoading: InputSignal<boolean> = input.required<boolean>();
    readonly actions: InputSignal<TemplateRef<{ $implicit: GameTableRow }>> = input.required<TemplateRef<{ $implicit: GameTableRow }>>();

    protected readonly descriptionTooltip = signal<string | null>(null);
    protected readonly descriptionTooltipPosition = signal<TooltipPosition>({ x: 0, y: 0 });

    ngOnInit(): void {
        if (!this.games() && !this.activeGames()) {
            throw new Error('No lists has been passed to fill the table.');
        }

        if (this.games() && this.activeGames()) {
            throw new Error('Too many lists has been passed to fill the table.');
        }
    }

    get gameList(): GameTableRow[] {
        return this.activeGames() ?? this.games() ?? [];
    }

    isActiveGame(): boolean {
        return this.activeGames() !== undefined;
    }

    getGame(gameRow: GameTableRow): IGame {
        return this.isActiveGameRow(gameRow) ? gameRow.game : gameRow;
    }

    getBoardObjectAt(game: IGame): (rowIndex: number, colIndex: number) => IItem | null {
        const cachedLookup = this.boardObjectLookupCache.get(game);

        if (cachedLookup) {
            return cachedLookup;
        }

        const objectAt = (rowIndex: number, colIndex: number): IItem | null => {
            return this.boardSharedService.getObjectAt(rowIndex, colIndex, game.board.items);
        };

        this.boardObjectLookupCache.set(game, objectAt);
        return objectAt;
    }

    numOfPlayer(gameRow: GameTableRow): number {
        return this.isActiveGameRow(gameRow) ? gameRow.players.length : 0;
    }

    maximumNumOfPlayer(gameRow: GameTableRow): number {
        return this.isActiveGameRow(gameRow) ? gameRow.maxPlayerCount : 0;
    }

    protected showDescriptionTooltip(event: MouseEvent, description: string): void {
        this.descriptionTooltip.set(description);
        this.updateTooltipPosition(event);
    }

    protected updateDescriptionTooltipPosition(event: MouseEvent): void {
        this.updateTooltipPosition(event);
    }

    protected hideDescriptionTooltip(): void {
        this.descriptionTooltip.set(null);
    }

    private isActiveGameRow(gameRow: GameTableRow): gameRow is IActiveGame {
        return 'game' in gameRow;
    }

    private updateTooltipPosition(event: MouseEvent): void {
        const containerRect = this.tableContainerRef?.nativeElement.getBoundingClientRect();
        const tooltipWidth = this.descriptionTooltipRef?.nativeElement.offsetWidth ?? GAME_TABLE_TOOLTIP_FALLBACK_WIDTH_PX;
        const tooltipHeight = this.descriptionTooltipRef?.nativeElement.offsetHeight ?? TOOLTIP_FALLBACK_HEIGHT_PX;
        this.descriptionTooltipPosition.set(
            computeTooltipPosition({
                event,
                containerRect,
                tooltipWidth,
                tooltipHeight,
                horizontalOffsetPx: TOOLTIP_HORIZONTAL_OFFSET_PX,
                verticalOffsetPx: TOOLTIP_VERTICAL_OFFSET_PX,
                fallbackPosition: {
                    x: event.clientX,
                    y: event.clientY + TOOLTIP_VERTICAL_OFFSET_PX,
                },
            }),
        );
    }
}
