/**
 * Testing strategy — Final Player List Component
 *
 * Approach:
 * - Validate list initialization, stat ordering, and display helpers using a deterministic stat-order stub.
 * - Exercise all icon path branches tied to current order + direction.
 *
 * Edge cases covered:
 * - Null/undefined player in avatar helper should return empty string.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrderDirection, StatOrderArgs } from '@app/constants/stats';
import { StatOrderService } from '@app/services/end/stat-order.service';
import { IActiveGame } from '@common/active-game';
import { ICharacter } from '@common/character';
import { CellType } from '@common/board';
import { Avatar, DiceType } from '@common/constants';
import { FinalPlayerListComponent } from './final-player-list.component';

const EXPECTED_VISITED_RATIO = 50;

describe('FinalPlayerListComponent', () => {
    let component: FinalPlayerListComponent;
    let fixture: ComponentFixture<FinalPlayerListComponent>;
    let statOrderServiceSpy: jasmine.SpyObj<StatOrderService>;

    const alice = createCharacter('Alice', ['0,0', '0,1']);
    const bob = createCharacter('Bob', ['0,0']);

    const activeGame = {
        players: [alice, bob],
        game: {
            board: {
                cells: [
                    [CellType.Empty, CellType.Empty],
                    [CellType.Empty, CellType.Empty],
                ],
            },
        },
    } as unknown as IActiveGame;

    beforeEach(async () => {
        statOrderServiceSpy = jasmine.createSpyObj<StatOrderService>('StatOrderService', ['orderPlayers'], {
            currentOrderArg: null,
            direction: OrderDirection.Descending,
        });
        statOrderServiceSpy.orderPlayers.and.returnValue([bob, alice]);

        TestBed.overrideComponent(FinalPlayerListComponent, { set: { template: '' } });

        await TestBed.configureTestingModule({
            imports: [FinalPlayerListComponent],
            providers: [{ provide: StatOrderService, useValue: statOrderServiceSpy }],
        }).compileComponents();

        fixture = TestBed.createComponent(FinalPlayerListComponent);
        component = fixture.componentInstance;
        component.activeGame = activeGame;
        fixture.detectChanges();
    });

    it('should initialize and order players by selected stat', () => {
        expect(component['orderedPlayers']).toEqual([alice, bob]);

        component.orderPlayers(StatOrderArgs.NCombats);

        expect(statOrderServiceSpy.orderPlayers).toHaveBeenCalled();
        expect(component['orderedPlayers']).toEqual([bob, alice]);
    });

    it('should build avatar URL and visited-tile ratio', () => {
        // Nominal case: avatar helper generates portrait URL.
        expect(component.getAvatarUrl(alice)).toContain('-portrait.png');
        expect(component.getPlayerVisitedTilesRatio(alice)).toBe(EXPECTED_VISITED_RATIO);

        // Edge case: missing character should return empty string.
        expect(component.getAvatarUrl(undefined as unknown as ICharacter)).toBe('');
    });

    it('should return icon path for each ordering state', () => {
        expect(component.getOrderDirectionIconPath(StatOrderArgs.NCombats)).toBe('assets/end/arrow-down-arrow-up.svg');

        Object.defineProperty(statOrderServiceSpy, 'currentOrderArg', { value: StatOrderArgs.NCombats });
        Object.defineProperty(statOrderServiceSpy, 'direction', { value: OrderDirection.Ascending });
        expect(component.getOrderDirectionIconPath(StatOrderArgs.NCombats)).toBe('assets/end/arrow-up.svg');

        Object.defineProperty(statOrderServiceSpy, 'direction', { value: OrderDirection.Descending });
        expect(component.getOrderDirectionIconPath(StatOrderArgs.NCombats)).toBe('assets/end/arrow-down.svg');
    });
});

function createCharacter(name: string, visitedCells: string[]): ICharacter {
    return {
        name,
        avatar: Avatar.Avatar1,
        initialHealth: 10,
        currentHealth: 10,
        attackBonusDiceType: DiceType.FourSided,
        defenseBonusDiceType: DiceType.SixSided,
        rapidityPoints: 4,
        attackPoints: 5,
        defensePoints: 5,
        actionsLeft: 1,
        movementLeft: 4,
        victories: 0,
        hasAbandoned: false,
        startingPosition: { x: 0, y: 0 },
        currentPosition: { x: 0, y: 0 },
        nCombats: 2,
        nVictories: 1,
        nDefeats: 1,
        totalDamageDealt: 3,
        totalDamageReceived: 4,
        visitedCells,
    };
}
