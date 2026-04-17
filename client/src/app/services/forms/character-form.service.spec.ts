/**
 * Testing strategy — CharacterFormService
 *
 * Approach:
 * - Exercise derived-stat helpers from controlled bonus/dice selections.
 * - Assert life/speed bonuses plus attack/defense and dice mapping outputs from form state.
 *
 * Edge cases covered:
 * - Missing bonus selection preserves default life and speed values.
 * - Alternate dice combinations map to the expected attack/defense dice types.
 */
import { HttpClient, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { BONUS_VALUE, BonusType, DiceSelectionType } from '@app/constants/character-form';
import { HTTP_CLIENT } from '@app/http/http-client-token';
import { IActiveGameWithPlayer } from '@common/active-game';
import { CharacterFormData, VirtualPlayerProfile } from '@common/character';
import {
    Avatar,
    DEFAULT_PLAYER_ATTACK_POINTS,
    DEFAULT_PLAYER_DEFENSE_POINTS,
    DEFAULT_PLAYER_LIFE_POINTS,
    DEFAULT_PLAYER_SPEED_POINTS,
    DiceType,
} from '@common/constants';
import { of } from 'rxjs';
import { CharacterFormService } from '@app/services/forms/character-form.service';
import SpyObj = jasmine.SpyObj;

describe('CharacterFormService', () => {
    let service: CharacterFormService;
    let httpClientSpy: SpyObj<HttpClient>;
    const gameId = 'cuvqyg3471fy43819fy43';
    const mockResponse = new HttpResponse<string>({ body: 'ok', status: 200 });

    beforeEach(() => {
        httpClientSpy = jasmine.createSpyObj('HttpClient', ['post', 'patch']);

        TestBed.configureTestingModule({
            providers: [CharacterFormService, { provide: HTTP_CLIENT, useValue: httpClientSpy }],
        });

        service = TestBed.inject(CharacterFormService);
    });

    // Edge case: When no bonus is selected, have default values for life and speed.
    it('should have default values for life and speed when no bonus is selected', () => {
        // Nominal case
        // Validate that life and speed points are equal to default values when no bonus is selected
        service.characterForm.controls.bonusType.setValue(null);

        expect(service.lifePoints).toEqual(DEFAULT_PLAYER_LIFE_POINTS);
        expect(service.speedPoints).toEqual(DEFAULT_PLAYER_SPEED_POINTS);
    });

    it('should add life bonus when bonusType is Life', () => {
        // Nominal case
        // Case where the life bonus is selected
        service.characterForm.controls.bonusType.setValue(BonusType.Life);

        const life = service.lifePoints;
        expect(life).toEqual(DEFAULT_PLAYER_LIFE_POINTS + BONUS_VALUE);
    });

    it('should add speed bonus when bonusType is Speed', () => {
        // Nominal case
        // Case where the speed bonus is selected
        service.characterForm.controls.bonusType.setValue(BonusType.Speed);
        const speed = service.speedPoints;

        expect(speed).toEqual(DEFAULT_PLAYER_SPEED_POINTS + BONUS_VALUE);
    });

    it('should compute attack and defense points correctly', () => {
        // Nominal case
        // Validate that attack and defense points are returned correctly

        expect(service.attackPoints).toEqual(DEFAULT_PLAYER_ATTACK_POINTS);
        expect(service.defensePoints).toEqual(DEFAULT_PLAYER_DEFENSE_POINTS);
    });

    it('should compute dice types correctly for D4AttackAndD6Defense', () => {
        // Nominal case
        // Validate the dice-type mapping when D4AttackAndD6Defense is selected

        service.characterForm.controls.diceType.setValue(DiceSelectionType.D4AttackAndD6Defense);

        expect(service.attackDiceType).toBe(DiceType.FourSided);
        expect(service.defenseDiceType).toBe(DiceType.SixSided);
    });

    it('should compute dice types correctly for the other selection', () => {
        // Nominal case
        // Validate the dice-type mapping when D6AttackAndD4Defense is selected

        service.characterForm.controls.diceType.setValue(DiceSelectionType.D6AttackAndD4Defense);

        expect(service.attackDiceType).toBe(DiceType.SixSided);
        expect(service.defenseDiceType).toBe(DiceType.FourSided);
    });

    it('should populate form with random data', () => {
        // Nominal case
        // Validate that form fields are correctly populated with random data (the data changes each time)
        service.populateWithRandomData();

        expect(service.characterForm.controls.playerName.value).toContain('Player');
        expect(service.characterForm.controls.avatar.value).not.toBeNull();
        expect(service.characterForm.controls.bonusType.value).not.toBeNull();
        expect(service.characterForm.controls.diceType.value).not.toBeNull();
    });

    it('should call createActiveGameWithCharacter', () => {
        // Nominal case
        // Validate that createActiveGameWithCharacter sends an HTTP POST request with the correct character data
        httpClientSpy.post.and.returnValue(of(mockResponse));

        const character = {} as CharacterFormData;

        service.createActiveGameWithCharacter(gameId, character).subscribe();

        expect(httpClientSpy.post).toHaveBeenCalledWith(
            jasmine.stringMatching('/activeGame/'),
            { gameId, characterForm: character },
            jasmine.any(Object),
        );
    });

    it('should call joinActiveGameWithCharacter', () => {
        // Nominal case
        // Validate that joinActiveGameWithCharacter sends an HTTP PATCH request with the correct character data

        httpClientSpy.patch = jasmine.createSpy().and.returnValue(of(mockResponse));

        const character = {} as CharacterFormData;

        service.joinActiveGameWithCharacter(gameId, character).subscribe();

        expect(httpClientSpy.patch).toHaveBeenCalledWith(
            jasmine.stringMatching('/activeGame/join'),
            { activeGameId: gameId, characterForm: character },
            jasmine.any(Object),
        );
    });

    it('should initialize form correctly', () => {
        // Nominal case
        // Validate that initializeForm resets the form and sets loading and error states to default values

        service.characterForm.controls.playerName.setValue('Test');
        service.isLoading.set(true);
        service.errors.set('Error');
        service.unavailableAvatars.set([Avatar.Avatar1]);

        service.initializeForm();

        expect(service.characterForm.controls.playerName.value).toBe('');
        expect(service.isLoading()).toBeFalse();
        expect(service.errors()).toBeNull();
        expect(service.unavailableAvatars()).toEqual([]);
    });
});
/* Merged from character-form.service.extra.spec.ts */

(() => {
    describe('CharacterFormService (extra)', () => {
        let service: CharacterFormService;
        let httpClientSpy: SpyObj<HttpClient>;

        beforeEach(() => {
            httpClientSpy = jasmine.createSpyObj('HttpClient', ['post', 'patch']);

            TestBed.configureTestingModule({
                providers: [CharacterFormService, { provide: HTTP_CLIENT, useValue: httpClientSpy }],
            });

            service = TestBed.inject(CharacterFormService);
        });

        it('creates a virtual player payload and joins active game', () => {
            // Nominal case: random form data is converted into a complete join payload.
            const activeGameId = 'active-123';
            const expectedAvatar = Avatar.Avatar2;
            const expectedName = 'VirtualPlayer';

            service.unavailableAvatars.set([Avatar.Avatar1]);
            spyOn(service, 'populateWithRandomData').and.callFake(() => {
                service.characterForm.patchValue({
                    playerName: expectedName,
                    avatar: expectedAvatar,
                    bonusType: BonusType.Life,
                    diceType: DiceSelectionType.D4AttackAndD6Defense,
                });
            });

            const joinSpy = spyOn(service, 'joinActiveGameWithCharacter').and.returnValue(of({} as IActiveGameWithPlayer));

            service.createVirtualPlayer(VirtualPlayerProfile.Defensive, activeGameId).subscribe();

            const expectedData: CharacterFormData = {
                name: expectedName,
                avatar: expectedAvatar,
                initialHealth: DEFAULT_PLAYER_LIFE_POINTS + 2,
                rapidityPoints: DEFAULT_PLAYER_SPEED_POINTS,
                attackPoints: DEFAULT_PLAYER_ATTACK_POINTS,
                defensePoints: DEFAULT_PLAYER_DEFENSE_POINTS,
                attackBonusDiceType: DiceType.FourSided,
                defenseBonusDiceType: DiceType.SixSided,
                virtualPlayerProfile: VirtualPlayerProfile.Defensive,
            };

            expect(joinSpy).toHaveBeenCalledWith(activeGameId, expectedData);
            expect(service.unavailableAvatars()).toEqual([Avatar.Avatar1, expectedAvatar]);
        });
    });
})();
