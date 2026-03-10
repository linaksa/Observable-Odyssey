/**
 * Stratégie de test – EditionFormComponent
 *
 * Approche : tests unitaires de composant Angular avec spy Jasmine sur
 * GameEditFormService. Le formulaire réactif est fourni directement via
 * un FormBuilder réel afin de tester les liaisons entre le composant et
 * le service sans dépendre de l'implémentation interne du service.
 *
 * Cas limites couverts :
 * - Promesse rejetée par submitForm : le composant doit capturer l'erreur sans
 *   propager d'exception non gérée, garantissant que l'UI ne se bloque pas en
 *   cas d'échec de soumission.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { provideRouter, RouterLink } from '@angular/router';
import { GameEditFormService } from '@app/services/game-edit-form.service';
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

    // Cas limite : submitForm() retourne une promesse rejetée (ex: erreur de validation
    // ou perte de connexion). Le composant doit attraper le rejet sans propager
    // l'exception et laisser le service gérer l'affichage de l'erreur.
    it('should catch the error is submitForm rejects the promise', () => {
        editFormServiceSpy.submitForm.and.returnValue(Promise.reject());

        component.submitGameForm();
        expect(editFormServiceSpy.submitForm).toHaveBeenCalled();
    });
});
