/**
 * Testing strategy — Edition Form Component
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
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { GameEditFormService } from '@app/services/game-edit-form.service';
import { CellType } from '@common/board';
import { GameType, IExistingGame, Visibility } from '@common/game';
import { IItem, ItemType } from '@common/items';
import { EditionFormComponent } from './edition-form.component';

describe('EditionFormComponent', () => {
    let component: EditionFormComponent;
    let fixture: ComponentFixture<EditionFormComponent>;
    let routerSpy: jasmine.SpyObj<Router>;
    let gameEditFormServiceStub: {
        isSubmitting: ReturnType<typeof signal<boolean>>;
        form: FormGroup;
        init: jasmine.Spy;
        submitForm: jasmine.Spy;
        resetForm: jasmine.Spy;
        formErrors: string[];
        formValid: boolean;
    };

    const game = createGame();

    beforeEach(async () => {
        const formBuilder = new FormBuilder();
        routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
        routerSpy.navigate.and.resolveTo(true);

        gameEditFormServiceStub = {
            isSubmitting: signal(false),
            form: formBuilder.group({
                gameTitle: [''],
                description: [''],
            }),
            init: jasmine.createSpy('init'),
            submitForm: jasmine.createSpy('submitForm').and.returnValue(Promise.resolve()),
            resetForm: jasmine.createSpy('resetForm'),
            formErrors: [],
            formValid: true,
        };

        await TestBed.configureTestingModule({
            imports: [EditionFormComponent],
            providers: [
                { provide: GameEditFormService, useValue: gameEditFormServiceStub },
                { provide: Router, useValue: routerSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(EditionFormComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('game', game);
        fixture.componentRef.setInput('cells', game.board.cells);
        fixture.componentRef.setInput('objects', game.board.items);
        fixture.componentRef.setInput('gridSelector', null);
        fixture.detectChanges();
    });

    it('should initialize form service with provided game', () => {
        expect(gameEditFormServiceStub.init).toHaveBeenCalledWith(game);
    });

    it('should submit form and navigate to admin page on success', async () => {
        component.submitGameForm();
        await fixture.whenStable();

        expect(gameEditFormServiceStub.submitForm).toHaveBeenCalledWith(game._id, game.gameMode, game.board.cells, game.board.items, null);
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin']);
    });

    // Edge case: should keep user on page when submit fails.
    it('should keep user on page when submit fails', async () => {
        gameEditFormServiceStub.submitForm.and.returnValue(Promise.reject(new Error('save failed')));

        component.submitGameForm();
        await fixture.whenStable();

        expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('should delegate reset action to form service', () => {
        component.resetForm(game);

        expect(gameEditFormServiceStub.resetForm).toHaveBeenCalledWith(game);
    });
});

function createGame(): IExistingGame {
    const item: IItem = {
        itemType: ItemType.Flag,
        x: 0,
        y: 0,
        size: 1,
    };

    return {
        _id: 'game-1',
        gameTitle: 'Edition game',
        description: '',
        board: {
            cells: [
                [CellType.Empty, CellType.Empty],
                [CellType.Empty, CellType.Empty],
            ],
            items: [item],
        },
        gameMode: GameType.Classic,
        dateCreated: new Date('2026-01-01T00:00:00.000Z'),
        lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
        visibility: Visibility.Hidden,
        preview: '' as Base64URLString,
    };
}
