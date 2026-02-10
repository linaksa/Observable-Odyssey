import { NgClass } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { GameService } from '@app/services/game.service';
import { CellType } from '@common/board';
import { GameType, IExistingGame, Visibility } from '@common/game';
import { Subject, takeUntil } from 'rxjs';

type DimensionSize = 'small' | 'medium' | 'large';

interface DimensionConfig {
    label: string;
    displaySize: string;
    numberOfPlayers: string;
    size: number;
}

@Component({
    selector: 'app-game-creation-dialog',
    imports: [ReactiveFormsModule, NgClass],
    templateUrl: './game-creation-dialog.component.html',
})
export class GameCreationDialogComponent implements OnInit, OnDestroy {
    private readonly fb = inject(FormBuilder);
    private readonly destroy$ = new Subject<void>();
    private readonly router = inject(Router);
    private readonly gameService = inject(GameService);

    private readonly dimensionConfigs: Record<DimensionSize, DimensionConfig> = {
        small: { label: 'Petite', displaySize: '10x10', numberOfPlayers: '2', size: 10 },
        medium: { label: 'Moyenne', displaySize: '15x15', numberOfPlayers: '2 à 4', size: 15 },
        large: { label: 'Grande', displaySize: '20x20', numberOfPlayers: '2 à 6', size: 20 },
    };

    form: FormGroup;
    numberOfPlayers: string = '';
    displaySize: string = '';
    size: number = 0;

    private readonly defaultDimension: DimensionSize = 'small';
    private readonly defaultIsCTF = false;

    readonly dimensionOptions: { value: DimensionSize; label: string; displaySize: string }[] = [
        { value: 'small', label: 'Petite', displaySize: '10x10' },
        { value: 'medium', label: 'Moyenne', displaySize: '15x15' },
        { value: 'large', label: 'Grande', displaySize: '20x20' },
    ];

    ngOnInit() {
        // Initialize form with proper control names and default values
        this.form = this.fb.group({
            dimension: [this.defaultDimension, Validators.required],
            isCTF: [{ value: this.defaultIsCTF, disabled: true }],
        });

        // Subscribe to dimension changes
        this.form
            .get('dimension')
            ?.valueChanges.pipe(takeUntil(this.destroy$))
            .subscribe((dimension: DimensionSize) => {
                this.updateGameInfo(dimension);
            });

        // Initialize with default values
        this.updateGameInfo(this.defaultDimension);
    }

    private updateGameInfo(dimension: DimensionSize) {
        const config = this.dimensionConfigs[dimension];

        if (config) {
            this.numberOfPlayers = config.numberOfPlayers;
            this.displaySize = config.displaySize;
            this.size = config.size;
        } else {
            const defaultConfig = this.dimensionConfigs[this.defaultDimension];
            this.numberOfPlayers = defaultConfig.numberOfPlayers;
            this.displaySize = defaultConfig.displaySize;
            this.size = defaultConfig.size;
        }
    }

    private isValidDimension(value: unknown): value is DimensionSize {
        return value === 'small' || value === 'medium' || value === 'large';
    }

    createGame() {
        if (this.form.invalid) {
            return;
        }

        const isCTF = this.form.get('isCTF')?.value ?? this.defaultIsCTF;

        const game: IExistingGame = {
            gameMode: isCTF ? GameType.Ctf : GameType.Classic,
            board: {
                items: [],
                cells: Array.from({ length: this.size }, () => Array(this.size).fill(CellType.Grass)),
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
        this.router.navigate(['/edit', 'new']);
    }

    toggleGameMode(isCTF: boolean) {
        this.form.get('isCTF')?.setValue(isCTF);
    }

    get selectedDimension(): string {
        const dimensionValue = this.form.get('dimension')?.value;

        if (this.isValidDimension(dimensionValue)) {
            return this.dimensionConfigs[dimensionValue].displaySize;
        }

        return this.dimensionConfigs[this.defaultDimension].displaySize;
    }

    get isCTFMode(): boolean {
        return this.form.get('isCTF')?.value ?? this.defaultIsCTF;
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
