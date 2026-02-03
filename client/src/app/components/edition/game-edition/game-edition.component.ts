import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, Input, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ActionSelectionButtonComponent } from '@app/components/edition/action-selection-button/action-selection-button.component';
import { EditionCellComponent } from '@app/components/edition/edition-cell/edition-cell.component';
import { EditionFormComponent } from '@app/components/edition/edition-form/edition-form.component';
import { AdministrationService } from '@app/services/administrationService';
import { BoardEditorService, Tool, ToolOption } from '@app/services/edition.service';
import { GameService } from '@app/services/game.service';
import { CellType } from '@common/board';
import { GameType, IExistingGame } from '@common/game';
import { ItemType } from '@common/items';

@Component({
    selector: 'app-game-edition',
    imports: [CommonModule, ReactiveFormsModule, MatButtonToggleModule, EditionCellComponent, ActionSelectionButtonComponent, EditionFormComponent],
    templateUrl: './game-edition.component.html',
    styleUrl: './game-edition.component.scss',
})
export class GameEditionComponent implements OnInit {
    @Input() gameToEdit: IExistingGame;

    adminService: AdministrationService = inject(AdministrationService);
    gameService: GameService = inject(GameService);
    editedGame: IExistingGame;
    board: BoardEditorService = inject(BoardEditorService);

    toolDescToolTip: { [key in ToolOption]: string } = {
        [ToolOption.Placement]: 'Placement d\'une tuile',
        [ToolOption.Objects]: 'Placement d\' un objet',
    };

    itemTypesDescLabels: { [key in ItemType]: string } = {
        [ItemType.LifeSanctuary]: 'Soigne le joueur',
        [ItemType.FightSanctuary]: 'Augmente les degats d\'attaque',
        [ItemType.StartingPosition]: 'Position d\'apparition du joueur',
        [ItemType.Flag]: 'Objectif pour le mode CTF ',
    };

    isDrawing = false;
    isShiftPressed = false;
    lastIndexes: [number, number] = [0, 0];

    constructor() {
        this.board.buildGrid(this.board.gridSize);
    }

    ngOnInit(): void {
        this.board.initFromExistingBoard(this.gameToEdit);
    }


    gameModeChange(event: Event): void {
        const selectElement = event.target as HTMLSelectElement;
        const selectedMode: GameType = selectElement.value as GameType;


        const hasFlag = this.board.getObjectCount(ItemType.Flag) > 0;
        if (hasFlag && selectedMode !== GameType.Ctf) {
            const res = confirm(
                'Changing the mode to Normal while a flag is placed will remove it.',
            );

            if (!res){
                this.board.changeGameMode(this.board.gameMode);
                selectElement.value = this.board.gameMode;
                return;
            };

        }
        this.board.changeGameMode(selectedMode);
    }

    selectTool(tool: Tool): void {
        this.board.activeTool = tool;
    }

    selectMaterial(material: CellType): void {
        this.board.selectedMaterial = material;
    }

    selectObject(object: ItemType): void {
        this.board.selectedObject = object;
    }


    onMouseDown(row: number, col: number, event: MouseEvent): void {
        this.isDrawing = true;
        this.lastIndexes = [row, col];

        if (event.button === 2) {
            if (this.isShiftPressed) {
                this.board.eraseObject(row, col);
            } else {
                this.board.eraseTile(row, col);
            }
            return;
        }

        if (this.board.activeTool === ToolOption.Objects) {
            this.board.applyObject(row, col);
            return;
        }

        if (this.board.activeTool === ToolOption.Placement && this.board.selectedMaterial === CellType.OpenDoor) {
            this.board.gameCells[row][col] =
                this.board.gameCells[row][col] === CellType.OpenDoor ? CellType.ClosedDoor : CellType.OpenDoor;
            return;
        }

        this.board.applyTile(row, col);
    }

    onMouseMove(row: number, col: number, event: MouseEvent): void {
        if (!this.isDrawing) return;
        if (this.lastIndexes[0] === row && this.lastIndexes[1] === col) return;

        this.lastIndexes = [row, col];

        if (event.buttons === 2) {
            if (this.isShiftPressed) {
                this.board.eraseObject(row, col);
            } else {
                this.board.eraseTile(row, col);
            }
            return;
        }

        if (this.board.activeTool === ToolOption.Placement) {
            this.board.applyTile(row, col);
        }
    }

    @HostListener('window:mouseup')
    stopDrawing(): void {
        this.isDrawing = false;
    }

    @HostListener('window:keydown.shift')
    onShiftDown(): void {
        this.isShiftPressed = true;
    }

    @HostListener('window:keyup.shift')
    onShiftUp(): void {
        this.isShiftPressed = false;
    }

    get availableItemsTypes(): ItemType[] {
        const baseAvailableItemTypes = [
            ItemType.LifeSanctuary,
            ItemType.FightSanctuary,
            ItemType.StartingPosition,
        ];

        if (this.board.gameMode === GameType.Ctf) {
            return baseAvailableItemTypes.concat([ItemType.Flag]);
        }
        return baseAvailableItemTypes;
    }
}
