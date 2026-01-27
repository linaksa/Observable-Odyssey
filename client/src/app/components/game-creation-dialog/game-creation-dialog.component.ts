import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatOption } from '@angular/material/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormField } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { Router } from '@angular/router';
import { AppMaterialModule } from '@app/modules/material.module';
import { GameService } from '@app/services/game.service';
import { CellType } from '@common/board';
import { GameType, IExistingGame, Visibility } from '@common/game';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-game-creation-dialog',
    imports: [AppMaterialModule, MatDialogModule, ReactiveFormsModule, MatFormField, MatOption, MatSelect],
    templateUrl: './game-creation-dialog.component.html',
    styleUrl: './game-creation-dialog.component.scss',
})
export class GameCreationDialogComponent implements OnInit, OnDestroy {
    private readonly fb = inject(FormBuilder);
    private readonly destroy$ = new Subject<void>();
    private readonly router = inject(Router);
    private readonly gameService = inject(GameService);
    private readonly dialogRef = inject(MatDialogRef<GameCreationDialogComponent>, { optional: true });

    form: FormGroup;
    description: string;
    numberOfPlayers: string = '2';
    gameSize: number = 100;

    ngOnInit() {
        this.form = this.fb.group({
            dimension: ['10x10'],
            isCTF: [{ value: false, disabled: true }],
        });

        this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((values) => {
            this.updateGameInfo(values.dimension);
        });

        this.updateGameInfo('10x10');
    }

    private updateGameInfo(dimension: string) {
        switch (dimension) {
            case '10x10':
                this.numberOfPlayers = '2';
                this.gameSize = 100;
                break;
            case '15x15':
                this.numberOfPlayers = '2 à 4';
                this.gameSize = 225;
                break;
            case '20x20':
                this.numberOfPlayers = '2 à 6';
                this.gameSize = 400;
                break;
        }
    }

    createGame() {
        const size = Math.sqrt(this.gameSize);

        const game: IExistingGame = {
            gameMode: this.form.get('isCTF')?.value ? GameType.Ctf : GameType.Classic,
            board: {
                items: [],
                cells: Array.from({ length: size }, () => Array(size).fill(CellType.Empty)),
            },
            gameTitle: '',
            _id: '',
            dateCreated: new Date(),
            lastModifiedDate: new Date(),
            description: '',
            visibility: Visibility.Hidden,
            preview: '',
        };
        this.gameService.gameUnderCreation = game;

        this.router.navigate(['/edit', 'creation']).then(() => {
            if (this.dialogRef) {
                this.dialogRef.close();
            }
        });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
