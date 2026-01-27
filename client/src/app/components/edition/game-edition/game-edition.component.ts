import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, Input, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ActionSelectionButtonComponent } from '@app/components/edition/action-selection-button/action-selection-button.component';
import { EditionCellComponent } from '@app/components/edition/edition-cell/edition-cell.component';
import { AdministrationService } from '@app/services/administrationService';
import { BoardEditorService, Tool, ToolOption } from '@app/services/edition.service';
import { GameEditFormService } from '@app/services/game-edit-form.service';
import { GameService } from '@app/services/game.service';
import { CellType } from '@common/board';
import { GameType, IExistingGame } from '@common/game';
import { ItemType } from '@common/items';

@Component({
    selector: 'app-game-edition',
    imports: [CommonModule, ReactiveFormsModule, MatButtonToggleModule, EditionCellComponent, ActionSelectionButtonComponent],
    templateUrl: './game-edition.component.html',
    styleUrl: './game-edition.component.scss',
})
export class GameEditionComponent implements OnInit {
    @Input() gameToEdit: IExistingGame;

    adminService: AdministrationService = inject(AdministrationService);
    gameService: GameService = inject(GameService);
    gameEditFormService: GameEditFormService = inject(GameEditFormService);
    editedGame: IExistingGame;
    board: BoardEditorService = inject(BoardEditorService);

    toolDescToolTip: { [key in ToolOption]: string } = {
        [ToolOption.Placement]: 'Placement d\'une tuile',
        [ToolOption.Objects]: 'Placement d\' un objet',
        [ToolOption.Erase]: 'Effacer un objet/une tuile',
    };

    itemTypesDescLabels: { [key in ItemType]: string } = {
        [ItemType.LifeSanctuary]: 'Soigne le joueur',
        [ItemType.FightSanctuary]: 'Augmente les degats d\'attaque',
        [ItemType.StartingPosition]: 'Position d\'apparition du joueur',
        [ItemType.Flag]: 'Objectif pour le mode CTF ',
    };

    isDrawing = false;
    lastIndexes: [number, number] = [0, 0];

    constructor() {
        this.board.buildGrid(this.board.gridSize);
    }

    ngOnInit(): void {
        this.gameEditFormService.init(this.gameToEdit);
        this.board.initFromExistingBoard(this.gameToEdit);
    }


    onGameModeChange(event: Event): void {
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

    submitGameForm(): void {
        this.gameEditFormService.submitForm(this.gameToEdit._id, this.board.gameCells, this.board.objects);
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


    onMouseDown(rowIndex: number, index: number): void {
        this.isDrawing = true;
        this.lastIndexes = [rowIndex, index];

        if (this.board.activeTool === ToolOption.Erase) {
            this.board.erase(rowIndex, index);
        } else if (this.board.activeTool === ToolOption.Objects) {
            this.board.applyObject(rowIndex, index);
        } else {
            if (this.board.activeTool === ToolOption.Placement && this.board.selectedMaterial === CellType.OpenDoor) {
                this.board.gameCells[rowIndex][index] =
                    this.board.gameCells[rowIndex][index] === CellType.OpenDoor ? CellType.ClosedDoor : CellType.OpenDoor;
                return;
            }
            this.board.applyTile(rowIndex, index);
        }
    }

    onMouseMove(rowIndex: number, index: number): void {
        if (!this.isDrawing) return;
        if (this.lastIndexes[0] === rowIndex && this.lastIndexes[1] === index) return;

        this.lastIndexes = [rowIndex, index];
        if (this.board.activeTool === ToolOption.Placement) {
            this.board.applyTile(rowIndex, index);
        }
        if (this.board.activeTool === ToolOption.Erase) {
            this.board.erase(rowIndex, index);
        }
    }

    @HostListener('window:mouseup')
    stopDrawing(): void {
        this.isDrawing = false;
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
