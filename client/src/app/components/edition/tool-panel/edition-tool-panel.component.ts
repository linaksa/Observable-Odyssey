import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { EditionItemSelectorComponent } from '@app/components/edition/item-selector/edition-item-selector.component';
import { ToolOption } from '@app/constants/grid-edition';
import { BoardEditorService } from '@app/services/editor/edition.service';
import { GameEditFormService } from '@app/services/forms/game-edit-form.service';
import { ErrorCode, getErrorMessage } from '@app/utils/error-codes';
import { CellType } from '@common/board';
import { GameType } from '@common/game';
import { ItemType } from '@common/items';

@Component({
    selector: 'app-edition-tool-panel',
    imports: [EditionItemSelectorComponent],
    templateUrl: './edition-tool-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'flex-1 min-w-0 min-h-0',
    },
})
export class EditionToolPanelComponent {
    protected readonly boardEditorService = inject(BoardEditorService);
    protected readonly gameEditFormService = inject(GameEditFormService);

    readonly toolDescriptions = input.required<Readonly<Record<ToolOption, string>>>();

    readonly toolSelected = output<ToolOption>();
    readonly materialSelected = output<CellType>();
    readonly objectSelected = output<ItemType>();

    protected readonly hasSpawnPointError = computed(() => {
        const validationCodes = this.gameEditFormService.validationErrorCodes();
        return (
            validationCodes.includes(ErrorCode.BoardInvalidSpawnCount) &&
            this.boardEditorService.getRemainingObjectCount(ItemType.StartingPosition) !== 0
        );
    });

    protected readonly spawnPointErrorMessage = computed(() => (this.hasSpawnPointError() ? getErrorMessage(ErrorCode.BoardInvalidSpawnCount) : ''));

    protected readonly hasFlagError = computed(() => {
        const validationCodes = this.gameEditFormService.validationErrorCodes();
        return validationCodes.includes(ErrorCode.BoardMissingFlag) && this.boardEditorService.gameMode === GameType.Ctf;
    });

    protected readonly flagErrorMessage = computed(() => (this.hasFlagError() ? getErrorMessage(ErrorCode.BoardMissingFlag) : ''));

    protected readonly objectErrorMessages = computed<readonly string[]>(() => {
        const messages: string[] = [];

        if (this.spawnPointErrorMessage().length > 0) {
            messages.push(this.spawnPointErrorMessage());
        }

        if (this.flagErrorMessage().length > 0) {
            messages.push(this.flagErrorMessage());
        }

        return messages;
    });

    protected toolButtonClass(tool: ToolOption): string {
        return this.boardEditorService.activeTool === tool ? 'btn flex-1 btn-blue' : 'btn flex-1';
    }
}
