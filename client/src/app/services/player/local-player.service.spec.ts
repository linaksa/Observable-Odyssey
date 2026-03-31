/**
 * Testing strategy — Local Player Service
 *
 * Approach:
 * - Keep each test focused on one behavior with deterministic setup.
 * - Assert state transitions directly through the public API.
 * - Cover nominal storage flow and guard-style empty-state behavior.
 *
 * Edge cases covered:
 * - Reading before initialization should return `undefined`.
 * - Re-setting a player should overwrite previous state.
 * - Clearing state should always reset the local player.
 */
import { TestBed } from '@angular/core/testing';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { LocalPlayerService } from './local-player.service';

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
        positionDepart: { x: 0, y: 0 },
        positionGrille: { x: 0, y: 0 },

        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
    };
}
