import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, Input, OnInit, ViewChild } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ActionSelectionButtonComponent } from '@app/components/edition/action-selection-button/action-selection-button.component';
import { EditionCellComponent } from '@app/components/edition/edition-cell/edition-cell.component';
import { EditionFormComponent } from '@app/components/edition/edition-form/edition-form.component';
import { CELL_TYPE_BACKGROUNDS, OBJECT_IMAGES } from '@app/constants/backgrounds-mapping';
import { ToolOption } from '@app/constants/grid-edition';
import { ITEM_INFO_BY_TYPE, TILE_INFO_BY_TYPE } from '@app/constants/tile-info';
import { BoardEditorService } from '@app/services/editor/edition.service';
import { BoardSharedService } from '@app/services/shared/board-shared.service';
import { CellType } from '@common/board';
import { GameType, IExistingGame } from '@common/game';
import { ItemType } from '@common/items';

@Component({
    standalone: true,
    selector: 'app-game-edition',
    imports: [CommonModule, ReactiveFormsModule, EditionCellComponent, ActionSelectionButtonComponent, EditionFormComponent, RouterLink],
    templateUrl: './game-edition.component.html',
    styleUrl: '../../../styles/game-cell.scss',
})
export class GameEditionComponent implements OnInit {
    @Input() gameToEdit: IExistingGame;
    @ViewChild('grid', { static: false })
    grid!: HTMLElement;

    @ViewChild(EditionFormComponent)
    editionForm!: EditionFormComponent;

    protected readonly boardEditorService: BoardEditorService = inject(BoardEditorService);
    protected readonly boardSharedService: BoardSharedService = inject(BoardSharedService);

    cellTypeBackgrounds = CELL_TYPE_BACKGROUNDS;
    toolIcons = OBJECT_IMAGES;

    toolDescToolTip: { [key in ToolOption]: string } = {
        [ToolOption.Placement]: "Placement d'une tuile",
        [ToolOption.Objects]: "Placement d'un objet",
    };

    readonly itemInfoByType = ITEM_INFO_BY_TYPE;
    readonly tileInfoByType = TILE_INFO_BY_TYPE;

    private isDrawing = false;
    private isShiftPressed = false;
    private lastIndexes: [number, number] = [0, 0];
    private currentCell: [number, number] | null = null;
    private isRightClick: boolean = false;
    private previousVersion: IExistingGame;

    ngOnInit(): void {
        this.boardEditorService.buildGrid(this.gameToEdit.board.cells.length);
        this.previousVersion = structuredClone(this.gameToEdit);
        this.boardEditorService.initFromExistingBoard(structuredClone(this.previousVersion));
    }

    selectTool(tool: ToolOption): void {
        this.boardEditorService.activeTool = tool;
    }

    selectMaterial(material: CellType): void {
        this.boardEditorService.selectedMaterial = material;
    }

    selectObject(object: ItemType): void {
        this.boardEditorService.selectedObject = object;
    }

    protected getGridCellTooltip(row: number, col: number, cellType: CellType): string {
        const objectAtCell = this.boardSharedService.getObjectAt(row, col, this.boardEditorService.objects);
        if (objectAtCell) {
            return this.itemInfoByType[objectAtCell.itemType].editorTooltip;
        }
        return this.tileInfoByType[cellType].editorTooltip;
    }

    onMouseDown(row: number, col: number, event: MouseEvent): void {
        this.isDrawing = true;
        this.lastIndexes = [row, col];
        this.currentCell = [row, col];
        this.isRightClick = event.button === 2;

        if (this.isRightClick) {
            if (this.isShiftPressed) {
                this.boardEditorService.eraseObject(row, col);
            } else {
                this.boardEditorService.eraseTile(row, col);
            }
            return;
        }

        if (this.boardEditorService.activeTool === ToolOption.Objects) {
            this.boardEditorService.applyObject(row, col);
            return;
        }

        this.boardEditorService.applyTile(row, col);
    }

    onMouseEnter(row: number, col: number, event: MouseEvent): void {
        if (!this.isDrawing) return;
        if (this.lastIndexes[0] === row && this.lastIndexes[1] === col) return;

        this.lastIndexes = [row, col];
        this.currentCell = [row, col];

        if (event.buttons === 2 || this.isRightClick) {
            if (this.isShiftPressed) {
                this.boardEditorService.eraseObject(row, col);
            } else {
                this.boardEditorService.eraseTile(row, col);
            }
            return;
        }

        if (this.boardEditorService.activeTool === ToolOption.Placement) {
            this.boardEditorService.applyTile(row, col);
        }
    }

    @HostListener('window:mouseup')
    stopDrawing(): void {
        this.isDrawing = false;
        this.isRightClick = false;
    }

    @HostListener('window:keydown.shift')
    onShiftDown(): void {
        this.isShiftPressed = true;

        if (!this.currentCell || !this.isDrawing || !this.isRightClick) return;
        const [row, col] = this.currentCell;

        this.boardEditorService.eraseObject(row, col);
    }

    @HostListener('window:keyup.shift')
    onShiftUp(): void {
        this.isShiftPressed = false;

        if (!this.currentCell || !this.isDrawing || !this.isRightClick) return;
        const [row, col] = this.currentCell;

        this.boardEditorService.eraseTile(row, col);
    }

    get availableItemsTypes(): ItemType[] {
        const baseAvailableItemTypes = [ItemType.LifeSanctuary, ItemType.FightSanctuary, ItemType.StartingPosition];

        if (this.boardEditorService.gameMode === GameType.Ctf) {
            return baseAvailableItemTypes.concat([ItemType.Flag]);
        }
        return baseAvailableItemTypes;
    }

    resetAll(): void {
        this.boardEditorService.revertGrid(this.previousVersion);
        this.editionForm.resetForm(this.previousVersion);
    }
}
