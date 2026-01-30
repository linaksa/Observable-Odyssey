import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { GameEditFormService } from '@app/services/game-edit-form.service';
import { CellType } from '@common/board';
import { IExistingGame } from '@common/game';
import { IItem } from '@common/items';

@Component({
  selector: 'app-edition-form',
  imports: [ReactiveFormsModule],
  templateUrl: './edition-form.component.html',
  styleUrl: './edition-form.component.scss',
})
export class EditionFormComponent implements OnInit {
  gameEditFormService = inject(GameEditFormService);

  @Input() game: IExistingGame;
  @Input() cells: CellType[][];
  @Input() objects: IItem[];

  @Output() onGameModeChange = new EventEmitter<Event>();

  ngOnInit(): void {
    this.gameEditFormService.init(this.game);
  }

  submitGameForm(): void {
    this.gameEditFormService.submitForm(this.game._id, this.cells, this.objects);
  }
}
