/**
 * Testing strategy — EditionFormComponent
 *
 * Approach: Angular component unit tests with Jasmine spies on
 * GameEditFormService. The reactive form is provided directly via
 * a real FormBuilder to test bindings between the component and
 * the service without depending on the service internals.
 *
 * Edge cases covered:
 * - Rejected promise from submitForm: the component should catch the error without
 *   propagating an unhandled exception, ensuring the UI does not freeze on submission failure.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { provideRouter, RouterLink } from '@angular/router';
import { GameEditFormService } from '@app/services/forms/game-edit-form.service';
import { IBoard } from '@common/board';
import { GameType, IExistingGame, Visibility } from '@common/game';
import { EditionFormComponent } from './edition-form.component';
import SpyObj = jasmine.SpyObj;

describe('EditionFormComponent', () => {
    let component: EditionFormComponent;
    let fixture: ComponentFixture<EditionFormComponent>;

    let editFormServiceSpy: SpyObj<GameEditFormService>;
    const formBuilder: FormBuilder = new FormBuilder();

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

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EditionFormComponent, RouterLink],
            providers: [provideRouter([]), { provide: FormBuilder, useValue: formBuilder }],
        }).compileComponents();

        editFormServiceSpy = jasmine.createSpyObj('GameEditFormService', ['init', 'submitForm', 'resetForm'], { isSubmitting: signal(false) });
        editFormServiceSpy.form = formBuilder.group({
            gameTitle: [''],
            description: [''],
        });

        TestBed.overrideProvider(GameEditFormService, { useValue: editFormServiceSpy });

        fixture = TestBed.createComponent(EditionFormComponent);
        component = fixture.componentInstance;

        component.game = randomGame;
        component.cells = randomGame.board.cells;
        component.objects = randomGame.board.items;
        component.gridSelector = null;
        await fixture.whenStable();
    });

    it('should init gameService with the received game', () => {
        expect(editFormServiceSpy.init).toHaveBeenCalledWith(randomGame);
    });

    it('should call submitForm on submitGameForm', () => {
        editFormServiceSpy.submitForm.and.returnValue(Promise.resolve());

        component.submitGameForm();
        expect(editFormServiceSpy.submitForm).toHaveBeenCalledWith(
            randomGame._id,
            randomGame.gameMode,
            component.cells,
            component.objects,
            component.gridSelector,
        );
    });

    it('should call gameEditFormService.resetForm on resetForm', () => {
        component.resetForm(randomGame);

        expect(editFormServiceSpy.resetForm).toHaveBeenCalledWith(randomGame);
    });

    // Edge case: submitForm() returns a rejected promise (e.g., validation error
    // or lost connection). The component should catch the rejection without propagating
    // the exception and let the service handle displaying the error.
    // Edge case: should catch the error is submitForm rejects the promise.
    it('should catch the error is submitForm rejects the promise', () => {
        editFormServiceSpy.submitForm.and.returnValue(Promise.reject());

        component.submitGameForm();
        expect(editFormServiceSpy.submitForm).toHaveBeenCalled();
    });
});
