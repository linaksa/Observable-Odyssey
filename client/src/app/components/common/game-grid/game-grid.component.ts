import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CELL_TYPE_BACKGROUNDS, CELL_TYPE_PATHS, ITEM_TYPE_PATHS, OBJECT_IMAGES, OBJECT_SPECIFIC_CLASSES } from '@app/constants/backgrounds-mapping';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { IItem, ItemType } from '@common/items';
import { buildAvatarAssetPath } from '@app/utils/avatar-path';

export interface GameGridCellEvent {
    rowIndex: number;
    colIndex: number;
    cellType: CellType;
    item: IItem | null;
    event: MouseEvent;
}

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
    readonly editable = input(false);
    readonly useBackgroundRendering = input(false);
    readonly players = input<readonly ICharacter[] | null>(null);
    readonly playerAvatarPortrait = input(true);
    readonly highlightedTiles = input<ReadonlySet<number> | null>(null);
    readonly gridClass = input('');

    readonly cellMouseDown = output<GameGridCellEvent>();
    readonly cellMouseEnter = output<GameGridCellEvent>();
    readonly cellContextMenu = output<GameGridCellEvent>();
    readonly cellClick = output<GameGridCellEvent>();
    readonly playerClicked = output<ICharacter>();

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

            const cellKey = this.getCellKey(player.positionGrille.y, player.positionGrille.x);
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

    objectAt(rowIndex: number, colIndex: number): IItem | null {
        return this.getObjectAt()(rowIndex, colIndex);
    }

    cellImagePath(cellType: CellType): string {
        return CELL_TYPE_PATHS[cellType];
    }

    cellBackgroundClass(cellType: CellType): string {
        return CELL_TYPE_BACKGROUNDS[cellType];
    }

    itemImagePath(item: IItem): string {
        return ITEM_TYPE_PATHS[item.itemType];
    }

    itemBackgroundClass(item: IItem): string {
        return this.joinClasses(
            OBJECT_IMAGES[item.itemType],
            OBJECT_SPECIFIC_CLASSES[item.itemType],
            this.isInactiveSanctuary(item) ? 'opacity-50' : '',
        );
    }

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

    itemTop(item: IItem, rowIndex: number): string {
        if (!this.isSanctuaryItem(item)) {
            return '0';
        }

        const relativeRow = rowIndex - item.x;
        return relativeRow === 0 ? '0' : '-100%';
    }

    itemLeft(item: IItem, rowIndex: number, colIndex: number): string {
        if (!this.isSanctuaryItem(item)) {
            return '0';
        }

        const relativeCol = colIndex - item.y;
        return relativeCol === 0 ? '0' : '-100%';
    }

    itemWidth(item: IItem): string {
        return this.isSanctuaryItem(item) ? '200%' : '100%';
    }

    itemHeight(item: IItem): string {
        return this.isSanctuaryItem(item) ? '200%' : '100%';
    }

    private isSanctuaryItem(item: IItem): boolean {
        return item.itemType === ItemType.LifeSanctuary || item.itemType === ItemType.FightSanctuary;
    }

    isInactiveSanctuary(item: IItem): boolean {
        return this.isSanctuaryItem(item) && item.active === false;
    }

    private getCellKey(rowIndex: number, colIndex: number): string {
        return `${rowIndex}:${colIndex}`;
    }

    itemBackgroundPosition(item: IItem, rowIndex: number, colIndex: number): string {
        if (!this.isSanctuaryItem(item)) {
            return '';
        }

        const relativeRow = rowIndex - item.x;
        const relativeCol = colIndex - item.y;

        if (relativeRow === 0 && relativeCol === 0) {
            return '0% 0%';
        }

        if (relativeRow === 0 && relativeCol === 1) {
            return '100% 0%';
        }

        if (relativeRow === 1 && relativeCol === 0) {
            return '0% 100%';
        }

        if (relativeRow === 1 && relativeCol === 1) {
            return '100% 100%';
        }

        return '';
    }

    private joinClasses(...classes: (string | false | null | undefined)[]): string {
        return classes.filter(Boolean).join(' ');
    }
}
