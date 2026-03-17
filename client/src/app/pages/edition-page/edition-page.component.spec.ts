/**
 * Stratégie de test – EditionPageComponent
 *
 * Approche : tests d'intégration Angular avec RouterTestingHarness.
 * L'harness permet de naviguer vers la route éditée et d'obtenir l'instance
 * du composant après l'activation de la route. Le composant enfant (GameEdition)
 * est remplacé par un composant mock pour éviter les dépendances transitives.
 * GameService est fourni en tant que spy Jasmine injecté via overrideProvider.
 *
 * Cas limites couverts :
 * - ID de route "creation" avec gameUnderCreation déjà défini dans le service :
 *   le composant doit réutiliser l'objet présent sans appeler getGameById.
 * - ID de route "creation" sans gameUnderCreation : le composant doit créer
 *   un nouveau jeu vide au lieu d'appeler getGameById.
 */
import { Component, Input } from '@angular/core';
import { MetadataOverride, TestBed } from '@angular/core/testing';
import { provideRouter, RouterLink } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { GameService } from '@app/services/game.service';
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

    // Cas limite : l'id de route est "creation" et gameUnderCreation est défini dans le
    // service. Le composant doit utiliser cet objet directement sans appeler getGameById.
    it('should choose the game saved in gameService if the id in the url is "creation"', async () => {
        gameServiceSpy.gameUnderCreation = randomGame;
        const instance = await harness.navigateByUrl('/edit/creation', EditionPageComponent);

        expect(gameServiceSpy.getGameById).not.toHaveBeenCalled();
        expect(instance.editedGame).toBe(gameServiceSpy.gameUnderCreation);
    });

    // Cas limite : l'id de route est "creation" mais aucun jeu n'est mémorisé dans le
    // service (ex: rechargement de page). Le composant doit créer un jeu vide par défaut.
    it('should create a new game if the id in the url is "creation" and there is no game saved in gameService', async () => {
        const instance = await harness.navigateByUrl('/edit/creation', EditionPageComponent);

        expect(gameServiceSpy.getGameById).not.toHaveBeenCalled();
        expect(instance.editedGame).not.toBeNull();
    });
});
