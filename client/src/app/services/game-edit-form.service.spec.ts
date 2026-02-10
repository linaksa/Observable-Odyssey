import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import SpyObj = jasmine.SpyObj;

import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { IBoard } from '@common/board';
import { EditGameFormData, GameType, IExistingGame, Visibility } from '@common/game';
import { GameEditFormService } from './game-edit-form.service';
import { GameService } from './game.service';

describe('GameEditFormService', () => {
    let service: GameEditFormService;
    let gameServiceSpy: SpyObj<GameService>;

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
        preview: '',
    };

    beforeEach(() => {
        TestBed.configureTestingModule({});
        gameServiceSpy = jasmine.createSpyObj('GameService', ['saveGame', 'createGame'], { mySignal: signal(false) });
        TestBed.overrideProvider(GameService, { useValue: gameServiceSpy });

        service = TestBed.inject(GameEditFormService);
    });

    it('should have all form fields', () => {
        expect(service.form.contains('gameTitle')).toBeTrue();
        expect(service.form.contains('description')).toBeTrue();
    });

    it('should take provided game value on init', () => {
        service.init(randomGame);

        expect(service.form.get('gameTitle')?.value).toBe(randomGame.gameTitle);
        expect(service.form.get('description')?.value).toBe(randomGame.description);
    });

    it('should not submit if preview image fails', async () => {
        spyOn(service, 'getPreviewImage').and.returnValue(Promise.resolve(null));

        try {
            await service.submitForm(randomGame._id, randomGame.gameMode, randomGame.board.cells, randomGame.board.items, null);
            fail('Submit form should have thrown an error');
        } catch {
            expect(service.formValid).toBeFalse();
            expect(service.formErrors).toHaveSize(1);
            expect(service.isSubmitting()).toBeFalse();

            expect(service.gameService.saveGame).not.toHaveBeenCalled();
        }
    });

    it('should submit form with correct data', async () => {
        const fakeImage = 'data:image/png;base64,fakeImageData' as Base64URLString;
        spyOn(service, 'getPreviewImage').and.callFake(() => Promise.resolve(fakeImage));

        randomGame._id = '1';
        gameServiceSpy.saveGame.and.returnValue(of(new HttpResponse<string>({ body: 'ok', status: 200 })));

        const newTitle = 'Updated Game Title';
        const newDescription = 'Updated Description';

        service.form.get('gameTitle')?.setValue(newTitle);
        service.form.get('description')?.setValue(newDescription);

        const expectedGameData: EditGameFormData = {
            gameTitle: newTitle,
            description: newDescription,
            gameMode: randomGame.gameMode,
            preview: fakeImage,
            board: randomGame.board,
        };

        await service.submitForm(randomGame._id, randomGame.gameMode, randomGame.board.cells, randomGame.board.items, null);
        expect(service.gameService.saveGame).toHaveBeenCalled();
        expect(service.gameService.saveGame).toHaveBeenCalledWith(randomGame._id, expectedGameData);
    });

    it('should submit form successfully with existing object', async () => {
        const fakeImage = 'data:image/png;base64,fakeImageData' as Base64URLString;
        spyOn(service, 'getPreviewImage').and.callFake(() => Promise.resolve(fakeImage));

        gameServiceSpy.saveGame.and.returnValue(of(new HttpResponse<string>({ body: 'ok', status: 200 })));
        randomGame._id = '1';

        await service.submitForm(randomGame._id, randomGame.gameMode, randomGame.board.cells, randomGame.board.items, null);
        expect(service.gameService.saveGame).toHaveBeenCalled();

        expect(service.formValid).toBeTrue();
        expect(service.formErrors).toHaveSize(0);
        expect(service.isSubmitting()).toBeFalse();

        gameServiceSpy.saveGame.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500, error: '{"error": "Save error"}' })));

        try {
            await service.submitForm(randomGame._id, randomGame.gameMode, randomGame.board.cells, randomGame.board.items, null);
            fail('Submit form should have thrown an error');
        } catch {
            expect(service.gameService.saveGame).toHaveBeenCalled();

            expect(service.formValid).toBeFalse();
            expect(service.formErrors).not.toHaveSize(0);
            expect(service.isSubmitting()).toBeFalse();
        }
    });

    it('should submit form successfully with newly created game', async () => {
        const fakeImage = 'data:image/png;base64,fakeImageData' as Base64URLString;
        spyOn(service, 'getPreviewImage').and.callFake(() => Promise.resolve(fakeImage));

        gameServiceSpy.createGame.and.returnValue(of(new HttpResponse<string>({ body: 'ok', status: 200 })));
        randomGame._id = '';

        await service.submitForm(randomGame._id, randomGame.gameMode, randomGame.board.cells, randomGame.board.items, null);
        expect(service.gameService.createGame).toHaveBeenCalled();

        expect(service.formValid).toBeTrue();
        expect(service.formErrors).toHaveSize(0);
        expect(service.isSubmitting()).toBeFalse();

        gameServiceSpy.createGame.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500, error: '{"error": "Save error"}' })));

        try {
            await service.submitForm(randomGame._id, randomGame.gameMode, randomGame.board.cells, randomGame.board.items, null);
            fail('Submit form should have thrown an error');
        } catch {
            expect(service.gameService.createGame).toHaveBeenCalled();

            expect(service.formValid).toBeFalse();
            expect(service.formErrors).not.toHaveSize(0);
            expect(service.isSubmitting()).toBeFalse();
        }
    });

    it('should return null if grid element does not exists', async () => {
        const grid = null;
        const result = await service.getPreviewImage(grid);
        expect(result).toBeNull();
    });

    it('should return null if html2canvas fails', async () => {
        const fakeElement = document.createElement('div');
        spyOn(HTMLCanvasElement.prototype, 'toDataURL').and.throwError('Canvas error');

        const result = await service.getPreviewImage(fakeElement);
        expect(result).toBeNull();
    });

    it('should return image data if html2canvas succeeds', async () => {
        const fakeElement = document.createElement('div');

        const fakeCanvas = document.createElement('canvas');
        spyOn(fakeCanvas, 'toDataURL').and.returnValue('data:image/png;base64,FAKE_BASE64');
        spyOn(service, 'customHtml2Canvas').and.returnValue(Promise.resolve(fakeCanvas));

        const result = await service.getPreviewImage(fakeElement);
        expect(result).not.toBeNull();
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
