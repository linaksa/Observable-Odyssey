import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, output } from '@angular/core';
import { GameGridCellEvent, GameGridComponent } from '@app/components/common/game-grid/game-grid.component';
import { BoardEditorService } from '@app/services/editor/edition.service';

@Component({
    selector: 'app-edition-grid-panel',
    imports: [GameGridComponent],
    templateUrl: './edition-grid-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'flex-2 min-w-0 min-h-0',
    },
})
export class EditionGridPanelComponent {
    protected readonly boardEditorService = inject(BoardEditorService);

    readonly cellMouseDown = output<GameGridCellEvent>();
    readonly cellMouseEnter = output<GameGridCellEvent>();

    @ViewChild('grid', { static: false, read: ElementRef })
    private grid?: ElementRef<HTMLElement>;

    getGridElement(): HTMLElement | null {
        return this.grid?.nativeElement ?? null;
    }
}
