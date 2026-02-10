import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, Input, OnInit, ViewChild } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ActionSelectionButtonComponent } from '@app/components/edition/action-selection-button/action-selection-button.component';
import { EditionCellComponent } from '@app/components/edition/edition-cell/edition-cell.component';
import { EditionFormComponent } from '@app/components/edition/edition-form/edition-form.component';
import { BoardEditorService, Tool, ToolOption } from '@app/services/edition.service';
import { GameService } from '@app/services/game.service';
import { CellType } from '@common/board';
import { GameType, IExistingGame } from '@common/game';
import { ItemType } from '@common/items';

@Component({
    standalone: true,
    selector: 'app-game-edition',
    imports: [CommonModule, ReactiveFormsModule, EditionCellComponent, ActionSelectionButtonComponent, EditionFormComponent, RouterLink],
    templateUrl: './game-edition.component.html',
    styleUrl: './game-edition.component.scss',
})
export class GameEditionComponent implements OnInit {
    @Input() gameToEdit: IExistingGame;
    @ViewChild('grid', { static: false })
    grid!: HTMLElement;

    @ViewChild(EditionFormComponent)
    editionForm!: EditionFormComponent;

    gameService: GameService = inject(GameService);
    boardEditorService: BoardEditorService = inject(BoardEditorService);

    toolDescToolTip: { [key in ToolOption]: string } = {
        [ToolOption.Placement]: "Placement d'une tuile",
        [ToolOption.Objects]: "Placement d'un objet",
    };

    itemTypesDescToolTip: { [key in ItemType]: string } = {
        [ItemType.LifeSanctuary]: 'Soigne le joueur',
        [ItemType.FightSanctuary]: "Augmente les degats d'attaque",
        [ItemType.StartingPosition]: "Position d'apparition du joueur",
        [ItemType.Flag]: 'Objectif pour le mode CTF ',
    };

    cellTypesDescToolTip: { [key in CellType]: string } = {
        [CellType.Empty]: 'Tuile de base',
        [CellType.Ice]: 'Ne consomme aucun mouvement',
        [CellType.Water]: 'Consomme deux fois plus de mouvement',
        [CellType.Wall]: "N'est pas traversable",
        [CellType.OpenDoor]: 'Une porte ouverte',
        [CellType.ClosedDoor]: 'Une porte fermée',
    };

    isDrawing = false;
    isShiftPressed = false;
    lastIndexes: [number, number] = [0, 0];
    currentCell: [number, number] | null = null;
    currentClick: number = 0;

    previousVersion: IExistingGame;

    ngOnInit(): void {
        this.boardEditorService.buildGrid(this.gameToEdit.board.cells.length);
        this.previousVersion = structuredClone(this.gameToEdit);
        this.boardEditorService.initFromExistingBoard(structuredClone(this.previousVersion));
    }

    selectTool(tool: Tool): void {
        this.boardEditorService.activeTool = tool;
    }

    selectMaterial(material: CellType): void {
        this.boardEditorService.selectedMaterial = material;
    }

    selectObject(object: ItemType): void {
        this.boardEditorService.selectedObject = object;
    }

    onMouseDown(row: number, col: number, event: MouseEvent): void {
        this.isDrawing = true;
        this.lastIndexes = [row, col];
        this.currentCell = [row, col];

        if (event.button === 2) {
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

        if (this.boardEditorService.activeTool === ToolOption.Placement && this.boardEditorService.selectedMaterial === CellType.OpenDoor) {
            this.boardEditorService.gameCells[row][col] =
                this.boardEditorService.gameCells[row][col] === CellType.OpenDoor ? CellType.ClosedDoor : CellType.OpenDoor;
            return;
        }

        this.boardEditorService.applyTile(row, col);
    }

    onMouseEnter(row: number, col: number, event: MouseEvent): void {
        if (!this.isDrawing) return;
        if (this.lastIndexes[0] === row && this.lastIndexes[1] === col) return;

        this.lastIndexes = [row, col];
        this.currentCell = [row, col];

        if (event.buttons === 2) {
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
    }

    @HostListener('window:keydown.shift')
    onShiftDown(): void {
        this.isShiftPressed = true;

        if (!this.currentCell || !this.isDrawing) return;
        const [row, col] = this.currentCell;

        this.boardEditorService.eraseObject(row, col);
    }

    @HostListener('window:keyup.shift')
    onShiftUp(): void {
        this.isShiftPressed = false;

        if (!this.currentCell || !this.isDrawing) return;
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
