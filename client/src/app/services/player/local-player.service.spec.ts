/**
 * Testing strategy — LocalPlayerService
 *
 * Approach:
 * - Exercise the service as an in-memory state holder via set/get/clear public methods.
 * - Assert transitions directly without framework mocks to keep behavior deterministic.
 *
 * Edge cases covered:
 * - Reading before initialization returns `undefined`.
 * - Setting a second player overwrites previous data, and clear resets state fully.
 */
import { TestBed } from '@angular/core/testing';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { LocalPlayerService } from '@app/services/player/local-player.service';

describe('LocalPlayerService', () => {
    let service: LocalPlayerService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(LocalPlayerService);
    });

    // Edge case: When required input data is missing, return undefined before a local player is set.
    it('should return undefined before a local player is set', () => {
        expect(service.getLocalPlayer()).toBeUndefined();
    });

    it('should store and return the local player', () => {
        const player = createCharacter('Alice');

        service.setLocalPlayer(player);

        expect(service.getLocalPlayer()).toEqual(player);
    });

    // Edge case: When setting a new one, overwrite previous local player.
    it('should overwrite previous local player when setting a new one', () => {
        service.setLocalPlayer(createCharacter('Alice'));
        service.setLocalPlayer(createCharacter('Bob'));

        expect(service.getLocalPlayer()?.name).toBe('Bob');
    });

    it('should clear local player', () => {
        service.setLocalPlayer(createCharacter('Alice'));

        service.clear();

        expect(service.getLocalPlayer()).toBeUndefined();
    });
});

function createCharacter(name: string): ICharacter {
    return {
        name,
        avatar: Avatar.Avatar1,
        initialHealth: 10,
        currentHealth: 10,
        attackBonusDiceType: DiceType.FourSided,
        defenseBonusDiceType: DiceType.SixSided,
        rapidityPoints: 4,
        attackPoints: 4,
        defensePoints: 4,
        actionsLeft: 1,
        movementLeft: 4,
        victories: 0,
        hasAbandoned: false,
        startingPosition: { x: 0, y: 0 },
        currentPosition: { x: 0, y: 0 },

        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
    };
}
