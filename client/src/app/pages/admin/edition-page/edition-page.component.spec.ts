/**
 * Testing strategy — EditionPageComponent
 *
 * Approach: Angular integration tests with RouterTestingHarness.
 * The harness allows navigation to the edited route and obtaining the component
 * instance after route activation. The child component (GameEdition)
 * is replaced by a mock to avoid transitive dependencies.
 * GameService is provided as a Jasmine spy injected via overrideProvider.
 *
 * Edge cases covered:
 * - Route id "creation" with gameUnderCreation already set in the service:
 *   the component should reuse the existing object without calling getGameById.
 * - Route id "creation" without gameUnderCreation: the component should create
 *   a new empty game instead of calling getGameById.
 */
import { Component, Input } from '@angular/core';
import { MetadataOverride, TestBed } from '@angular/core/testing';
import { provideRouter, RouterLink } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { GameService } from '@app/services/admin/game.service';
import { IBoard } from '@common/board';
import { GameType, IExistingGame, Visibility } from '@common/game';
import { of } from 'rxjs';
import { EditionPageComponent } from './edition-page.component';
import SpyObj = jasmine.SpyObj;

@Component({
    selector: 'app-game-edition',
    standalone: true,
    template: '',
})
class MockGameEditionComponent {
    @Input() gameToEdit: IExistingGame;
}

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

describe('EditionPageComponent', () => {
    let harness: RouterTestingHarness;

    let gameServiceSpy: SpyObj<GameService>;

    beforeEach(async () => {
        const overrideInfo: MetadataOverride<Component> = {
            set: { imports: [MockGameEditionComponent] },
        };
        TestBed.overrideComponent(EditionPageComponent, overrideInfo);

        gameServiceSpy = jasmine.createSpyObj('GameService', ['getGameById']);
        TestBed.overrideProvider(GameService, { useValue: gameServiceSpy });
        gameServiceSpy.getGameById.and.returnValue(of(randomGame));

        TestBed.configureTestingModule({
            imports: [EditionPageComponent, RouterLink],
            providers: [provideRouter([{ path: 'edit/:gameId', component: EditionPageComponent }])],
        });

        harness = await RouterTestingHarness.create();
    });

    it('should fetch the game by the id in the url', async () => {
        const instance = await harness.navigateByUrl('/edit/123', EditionPageComponent);

        expect(instance).toBeTruthy();
        expect(gameServiceSpy.getGameById).toHaveBeenCalledWith('123');
    });

    // Edge case: the route id is "creation" and gameUnderCreation is set in the
    // service. The component must use that object directly without calling getGameById.
    it('should choose the game saved in gameService if the id in the url is "creation"', async () => {
        gameServiceSpy.gameUnderCreation = randomGame;
        const instance = await harness.navigateByUrl('/edit/creation', EditionPageComponent);

        expect(gameServiceSpy.getGameById).not.toHaveBeenCalled();
        expect(instance.editedGame).toBe(gameServiceSpy.gameUnderCreation);
    });

    // Edge case: the route id is "creation" but no game is stored in the
    // service (e.g., page reload). The component must create a default empty game.
    it('should create a new game if the id in the url is "creation" and there is no game saved in gameService', async () => {
        const instance = await harness.navigateByUrl('/edit/creation', EditionPageComponent);

        expect(gameServiceSpy.getGameById).not.toHaveBeenCalled();
        expect(instance.editedGame).not.toBeNull();
    });
});
