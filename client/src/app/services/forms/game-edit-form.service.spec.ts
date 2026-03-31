/**
 * Testing strategy — GameEditFormService
 *
 * Approach: Angular unit tests with GameService replaced by a Jasmine spy.
 * The reactive form object is inspected directly to validate initial values
 * and transformations. The submit flow is exercised for both save and create
 * paths, as well as for service failures.
 *
 * Edge cases covered:
 * - Save and create failures should set `formValid` to false, populate errors,
 *   and reset the submission flag.
 * - The form should reset to the provided values without requiring any extra
 *   DOM capture step.
 */
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { IBoard } from '@common/board';
import { EditGameFormData, GameType, IExistingGame, Visibility } from '@common/game';
import { GameService } from '@app/services/admin/game.service';
import { GameEditFormService } from './game-edit-form.service';

describe('GameEditFormService', () => {
    let service: GameEditFormService;
    let gameServiceSpy: jasmine.SpyObj<GameService>;

    const randomBoard: IBoard = { cells: [[]], items: [] };
    const randomGame: IExistingGame = {
        _id: '1',
        gameTitle: 'Test Game',
        description: 'A game for testing',
        board: randomBoard,
        gameMode: GameType.Classic,
        lastModifiedDate: new Date(),
        visibility: Visibility.Hidden,
        dateCreated: new Date(),
    };

    beforeEach(() => {
        TestBed.configureTestingModule({});
        gameServiceSpy = jasmine.createSpyObj('GameService', ['saveGame', 'createGame']);
        TestBed.overrideProvider(GameService, { useValue: gameServiceSpy });

        service = TestBed.inject(GameEditFormService);
    });

    it('should have title and description form fields', () => {
        expect(service.form.contains('gameTitle')).toBeTrue();
        expect(service.form.contains('description')).toBeTrue();
    });

    it('should take provided game value on init', () => {
        service.init(randomGame);

        expect(service.form.get('gameTitle')?.value).toBe(randomGame.gameTitle);
        expect(service.form.get('description')?.value).toBe(randomGame.description);
    });

    it('should submit form with correct data when saving an existing game', async () => {
        const newTitle = 'Updated Game Title';
        const newDescription = 'Updated Description';
        const expectedGameData: EditGameFormData = {
            gameTitle: newTitle,
            description: newDescription,
            gameMode: randomGame.gameMode,
            board: randomGame.board,
        };

        service.form.get('gameTitle')?.setValue(newTitle);
        service.form.get('description')?.setValue(newDescription);
        gameServiceSpy.saveGame.and.returnValue(of(new HttpResponse<string>({ body: 'ok', status: 200 })));

        await service.submitForm(randomGame._id, randomGame.gameMode, randomGame.board.cells, randomGame.board.items);

        expect(gameServiceSpy.saveGame).toHaveBeenCalledWith(randomGame._id, expectedGameData);
        expect(service.formValid).toBeTrue();
        expect(service.formErrors).toHaveSize(0);
        expect(service.isSubmitting()).toBeFalse();
    });

    it('should submit form with correct data when creating a new game', async () => {
        const newTitle = 'New Game Title';
        const newDescription = 'New Description';
        const expectedGameData: EditGameFormData = {
            gameTitle: newTitle,
            description: newDescription,
            gameMode: GameType.Ctf,
            board: randomGame.board,
        };

        service.form.get('gameTitle')?.setValue(newTitle);
        service.form.get('description')?.setValue(newDescription);
        gameServiceSpy.createGame.and.returnValue(of(new HttpResponse<string>({ body: 'ok', status: 201 })));

        await service.submitForm('', GameType.Ctf, randomGame.board.cells, randomGame.board.items);

        expect(gameServiceSpy.createGame).toHaveBeenCalledWith(expectedGameData);
        expect(service.formValid).toBeTrue();
        expect(service.formErrors).toHaveSize(0);
        expect(service.isSubmitting()).toBeFalse();
    });

    it('should record save errors and stop submitting', async () => {
        gameServiceSpy.saveGame.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500, error: { error: 'Save error' } })));

        await expectAsync(service.submitForm(randomGame._id, randomGame.gameMode, randomGame.board.cells, randomGame.board.items)).toBeRejected();

        expect(service.formValid).toBeFalse();
        expect(service.formErrors[0]).toBe('Une erreur est survenue lors de la sauvegarde du jeu.');
        expect(service.isSubmitting()).toBeFalse();
    });

    it('should record create errors and stop submitting', async () => {
        gameServiceSpy.createGame.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500, error: { error: 'Create error' } })));

        await expectAsync(service.submitForm('', GameType.Classic, randomGame.board.cells, randomGame.board.items)).toBeRejected();

        expect(service.formValid).toBeFalse();
        expect(service.formErrors[0]).toBe('Une erreur est survenue lors de la sauvegarde du jeu.');
        expect(service.isSubmitting()).toBeFalse();
    });

    it('should reset form', () => {
        const newTitle = 'Updated Game Title';
        const newDescription = 'Updated Description';

        service.form.get('gameTitle')?.setValue(newTitle);
        service.form.get('description')?.setValue(newDescription);

        service.resetForm(randomGame);

        expect(service.form.get('gameTitle')?.value).toBe(randomGame.gameTitle);
        expect(service.form.get('description')?.value).toBe(randomGame.description);
    });
});
