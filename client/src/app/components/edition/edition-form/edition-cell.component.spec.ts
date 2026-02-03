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

    editFormServiceSpy = jasmine.createSpyObj('GameEditFormService', ['init', 'submitForm'], {isSubmitting: signal(false) });
    editFormServiceSpy.form = formBuilder.group({
      gameTitle: [''],
      description: [''],
      gameMode: [GameType.Classic],
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
    expect(editFormServiceSpy.submitForm).toHaveBeenCalledWith(randomGame._id, component.cells, component.objects, component.gridSelector);
  });
});
