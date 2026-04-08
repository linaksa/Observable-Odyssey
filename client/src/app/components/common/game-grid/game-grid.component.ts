import { afterEveryRender, ChangeDetectionStrategy, Component, computed, ElementRef, input, output, ViewChild } from '@angular/core';
import { buildAvatarAssetPath } from '@app/utils/avatar-path';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { IItem } from '@common/items';
import {
    buildCellBackgroundClass,
    buildCellImagePath,
    buildItemBackgroundClass,
    buildItemBackgroundPosition,
    buildItemHeight,
    buildItemImagePath,
    buildItemLeft,
    buildItemTop,
    buildItemWidth,
    isInactiveSanctuary,
    isPreviewCell,
    previewCellBackgroundClass,
    previewCellBackgroundPosition,
} from './game-grid-layout';
import { GameGridTooltipController } from './game-grid-tooltip.controller';
import type { GameGridCellEvent, PlacementPreview } from './game-grid-types';
export type { GameGridCellEvent, PlacementPreview, TooltipPosition } from './game-grid-types';

@Component({
    selector: 'app-game-grid',
    templateUrl: './game-grid.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'block w-full',
        tabindex: '-1',
    },
})
export class GameGridComponent {
    readonly cells = input.required<CellType[][]>();
    readonly getObjectAt = input.required<(rowIndex: number, colIndex: number) => IItem | null>();
    readonly objects = input<readonly IItem[] | null>(null);
    readonly editable = input(false);
    readonly useBackgroundRendering = input(false);
    readonly players = input<readonly ICharacter[] | null>(null);
    readonly playerAvatarPortrait = input(true);
    readonly highlightedTiles = input<ReadonlySet<number> | null>(null);
    readonly highlightedTileClass = input('bg-blue-600/30');
    readonly gridClass = input('');
    readonly showTooltip = input(false);
    readonly getTooltipText = input<((rowIndex: number, colIndex: number, cellType: CellType, item: IItem | null) => string | null) | null>(null);
    readonly placementPreview = input<PlacementPreview | null>(null);

    readonly cellMouseDown = output<GameGridCellEvent>();
    readonly cellMouseEnter = output<GameGridCellEvent>();
    readonly cellMouseLeave = output<void>();
    readonly cellContextMenu = output<GameGridCellEvent>();
    readonly cellClick = output<GameGridCellEvent>();
    readonly playerClicked = output<ICharacter>();

    private readonly tooltipController = new GameGridTooltipController({
        cells: () => this.cells(),
        objects: () => this.objects(),
        getObjectAt: () => this.getObjectAt(),
        showTooltip: () => this.showTooltip(),
        getTooltipText: () => this.getTooltipText(),
        getGridContainer: () => this.gridContainerRef?.nativeElement ?? null,
        getTooltipElement: () => this.tooltipRef?.nativeElement ?? null,
    });

    protected readonly hoveredCell = this.tooltipController.hoveredCell;
    protected readonly tooltipPointer = this.tooltipController.tooltipPointer;
    protected readonly tooltipText = this.tooltipController.tooltipText;
    protected readonly tooltipLines = this.tooltipController.tooltipLines;
    protected readonly tooltipPosition = this.tooltipController.tooltipPosition;
    protected readonly cellImagePath = buildCellImagePath;
    protected readonly cellBackgroundClass = buildCellBackgroundClass;
    protected readonly itemImagePath = buildItemImagePath;
    protected readonly itemBackgroundClass = buildItemBackgroundClass;
    protected readonly itemBackgroundPosition = buildItemBackgroundPosition;
    protected readonly itemTop = buildItemTop;
    protected readonly itemLeft = (item: IItem, rowIndex: number, colIndex: number): string => buildItemLeft(item, colIndex);
    protected readonly itemWidth = buildItemWidth;
    protected readonly itemHeight = buildItemHeight;
    protected readonly isInactiveSanctuary = isInactiveSanctuary;
    protected readonly isPreviewCell = (rowIndex: number, colIndex: number): boolean => isPreviewCell(this.placementPreview(), rowIndex, colIndex);
    protected readonly previewCellBackgroundClass = (): string => previewCellBackgroundClass(this.placementPreview());
    protected readonly previewCellBackgroundPosition = (rowIndex: number, colIndex: number): string =>
        previewCellBackgroundPosition(this.placementPreview(), rowIndex, colIndex);

    @ViewChild('gridContainer', { read: ElementRef })
    private gridContainerRef?: ElementRef<HTMLDivElement>;

    @ViewChild('tooltipElement', { read: ElementRef })
    private tooltipRef?: ElementRef<HTMLDivElement>;

    constructor() {
        afterEveryRender({
            read: () => this.tooltipController.syncTooltipPosition(),
        });
    }

    readonly gridTemplateColumns = computed(() => {
        const size = this.cells()[0]?.length ?? this.cells().length;
        return `repeat(${size > 0 ? size : 1}, 1fr)`;
    });

    readonly resolvedGridClass = computed(() =>
        this.joinClasses(
            'grid aspect-square max-h-full max-w-full w-full auto-rows-fr select-none bg-[#0f1528] outline-none overflow-hidden',
            this.gridClass(),
        ),
    );

    readonly resolvedCellClass = computed(() =>
        this.joinClasses('relative select-none size-full outline-none overflow-hidden', this.editable() ? 'cursor-crosshair' : ''),
    );

    readonly playersByCell = computed(() => {
        const players = this.players();

        if (!players?.length) {
            return new Map<string, ICharacter[]>();
        }

        const playersByCell = new Map<string, ICharacter[]>();

        for (const player of players) {
            if (player.hasAbandoned) {
                continue;
            }

            const cellKey = this.getCellKey(player.currentPosition.y, player.currentPosition.x);
            const playersAtCell = playersByCell.get(cellKey) ?? [];
            playersAtCell.push(player);
            playersByCell.set(cellKey, playersAtCell);
        }

        return playersByCell;
    });

    readonly playerAvatarClass = computed(() =>
        this.joinClasses(
            'absolute inset-0 z-40 bg-center bg-size-[100%_100%] bg-no-repeat focus-visible:ring-2',
            'focus-visible:ring-blue-400 [image-rendering:pixelated]',
            this.playerAvatarPortrait() ? 'rounded-full m-1' : '',
        ),
    );

    readonly highlightedTileOverlayClass = computed(() => this.joinClasses('absolute inset-0 z-20 pointer-events-none', this.highlightedTileClass()));

    readonly objectAt = (rowIndex: number, colIndex: number): IItem | null => this.getObjectAt()(rowIndex, colIndex);

    playerAvatarUrl(player: ICharacter): string {
        return buildAvatarAssetPath(player.avatar, this.playerAvatarPortrait());
    }

    playersAt(rowIndex: number, colIndex: number): ICharacter[] {
        return this.playersByCell().get(this.getCellKey(rowIndex, colIndex)) ?? [];
    }

    onCellMouseDown(rowIndex: number, colIndex: number, cellType: CellType, item: IItem | null, event: MouseEvent): void {
        if (!this.editable()) {
            return;
        }

        event.preventDefault();
        this.cellMouseDown.emit({ rowIndex, colIndex, cellType, item, event });
    }

    onCellMouseEnter(rowIndex: number, colIndex: number, cellType: CellType, item: IItem | null, event: MouseEvent): void {
        if (!this.editable()) {
            return;
        }

        this.cellMouseEnter.emit({ rowIndex, colIndex, cellType, item, event });

        if (this.showTooltip()) {
            this.tooltipController.showCellTooltip(event, rowIndex, colIndex);
        }
    }

    onCellMouseMove(event: MouseEvent): void {
        if (this.showTooltip() && this.hoveredCell()) {
            this.tooltipController.onCellMouseMove(event);
        }
    }

    onCellMouseLeave(): void {
        this.cellMouseLeave.emit();

        if (this.showTooltip()) {
            this.tooltipController.clearTooltip();
        }
    }

    onCellContextMenu(rowIndex: number, colIndex: number, cellType: CellType, item: IItem | null, event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.cellContextMenu.emit({ rowIndex, colIndex, cellType, item, event });
    }

    onCellClick(rowIndex: number, colIndex: number, cellType: CellType, item: IItem | null, event: MouseEvent): void {
        this.cellClick.emit({ rowIndex, colIndex, cellType, item, event });
    }

    onPlayerClick(player: ICharacter, event: MouseEvent): void {
        event.stopPropagation();
        this.playerClicked.emit(player);
    }

    private getCellKey(rowIndex: number, colIndex: number): string {
        return `${rowIndex}:${colIndex}`;
    }

    private joinClasses(...classes: (string | false | null | undefined)[]): string {
        return classes.filter(Boolean).join(' ');
    }
}
