/**
 * Testing strategy — Game Creation Dialog Component
 *
 * Approach:
 * - Keep each test focused on one behavior with deterministic mocks/spies.
 * - Validate both nominal flows and failure paths that could break UX/state.
 * - Assert side effects explicitly (state changes, emitted events, and service calls).
 *
 * Edge cases covered:
 * - Missing or invalid input guards and safe early returns.
 * - Error handling paths and fallback user-facing messaging.
 * - Cleanup/teardown behavior (unsubscribe/reset/disconnect) when applicable.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { GameService } from '@app/services/admin/game.service';
import { CellType } from '@common/board';
import { GameType } from '@common/game';
import { GameCreationDialogComponent } from './game-creation-dialog.component';

const SMALL_GRID_SIZE = 10;

describe('GameCreationDialogComponent', () => {
    let component: GameCreationDialogComponent;
    let fixture: ComponentFixture<GameCreationDialogComponent>;
    let routerSpy: jasmine.SpyObj<Router>;
    let gameServiceStub: { gameUnderCreation?: unknown };

    beforeEach(async () => {
        routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
        routerSpy.navigate.and.resolveTo(true);
        gameServiceStub = {};

        await TestBed.configureTestingModule({
            imports: [GameCreationDialogComponent],
            providers: [
                { provide: Router, useValue: routerSpy },
                { provide: GameService, useValue: gameServiceStub },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameCreationDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should initialize form with default size and game info', () => {
        expect(component.form.get('dimension')?.value).toBe('small');
        expect(component.form.get('isCTF')?.value).toBeFalse();
        expect(component.form.get('isCTF')?.disabled).toBeTrue();
        expect(component.numberOfPlayers).toBe('2');
        expect(component.displaySize).toBe('10x10');
    });

    it('should update displayed game info when dimension changes', () => {
        component.form.get('dimension')?.setValue('medium');

        expect(component.numberOfPlayers).toBe('2 à 4');
        expect(component.displaySize).toBe('15x15');
    });

    // Edge case: When an unknown dimension key is provided, the component should fall back to default game info.
    it('should fallback to default game info for unknown dimension key', () => {
        const privateApi = component as unknown as { updateGameInfo: (dimension: string) => void };

        privateApi.updateGameInfo('unknown-size');

        expect(component.numberOfPlayers).toBe('2');
        expect(component.displaySize).toBe('10x10');
    });

    // Edge case: When form is invalid, it should not create game.
    it('should not create game when form is invalid', () => {
        component.form.reset();

        component.createGame();

        expect(gameServiceStub.gameUnderCreation).toBeUndefined();
        expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('should create classic game with selected dimension and navigate to edition page', () => {
        component.form.get('dimension')?.setValue('small');

        component.createGame();

        const createdGame = gameServiceStub.gameUnderCreation as {
            gameMode: GameType;
            board: { cells: CellType[][] };
        };

        expect(createdGame.gameMode).toBe(GameType.Classic);
        expect(createdGame.board.cells.length).toBe(SMALL_GRID_SIZE);
        expect(createdGame.board.cells[0][0]).toBe(CellType.Empty);
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/edit', 'creation']);
    });

    it('should toggle CTF mode and create CTF game', () => {
        component.toggleGameMode(true);

        expect(component.isCTFMode).toBeTrue();

        component.createGame();

        const createdGame = gameServiceStub.gameUnderCreation as { gameMode: GameType };
        expect(createdGame.gameMode).toBe(GameType.Ctf);
    });

    // Edge case: When control is missing, fall back to default CTF value.
    it('should fallback to default CTF value when control is missing', () => {
        component.form.removeControl('isCTF');

        component.createGame();

        const createdGame = gameServiceStub.gameUnderCreation as { gameMode: GameType };
        expect(createdGame.gameMode).toBe(GameType.Classic);
        expect(component.isCTFMode).toBeFalse();
    });

    // Edge case: When the component is destroyed after subscription setup, it should unsubscribe from dimension changes.
    it('should unsubscribe from dimension changes on destroy', () => {
        const privateApi = component as unknown as { updateGameInfo: (dimension: string) => void };
        const updateSpy = spyOn(privateApi, 'updateGameInfo').and.callThrough();
        updateSpy.calls.reset();

        component.ngOnDestroy();
        component.form.get('dimension')?.setValue('large');

        expect(updateSpy).not.toHaveBeenCalled();
    });
});
