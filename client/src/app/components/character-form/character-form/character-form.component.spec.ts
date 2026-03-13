import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { BonusType, DiceSelectionType } from '@app/constants/character-form';
import { CharacterFormService } from '@app/services/character-form.service';
import { CharacterFormData } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { CharacterFormComponent } from './character-form.component';

@Component({
    selector: 'app-avatar-selector',
    standalone: true,
    template: '',
})
class MockAvatarSelectorComponent {
    @Input() form: FormGroup;
    @Input() unavailableAvatars: Avatar[];
}

@Component({
    selector: 'app-character-info-panel',
    template: '',
    standalone: true,
    inputs: ['form'],
})
class MockCharacterInfoPanelComponent {
    @Input() form: FormGroup;
}

@Component({
    selector: 'app-character-modifier-panel',
    template: '',
    standalone: true,
})
class MockCharacterModifierPanelComponent {
    @Input() form: FormGroup;
    @Output() formSubmitted = new EventEmitter<void>();
}


describe('CharacterFormComponent', () => {
    let component: CharacterFormComponent;
    let fixture: ComponentFixture<CharacterFormComponent>;

    let characterFormServiceSpy: jasmine.SpyObj<CharacterFormService>;

    const dummyPointsValue = 5;
    const dummyDiceType = DiceType.FourSided;

    beforeEach(async () => {
        const overrideInfo: MetadataOverride<Component> = {
            set: { imports: [MockAvatarSelectorComponent, MockCharacterInfoPanelComponent, MockCharacterModifierPanelComponent] },
        };
        TestBed.overrideComponent(CharacterFormComponent, overrideInfo);

        characterFormServiceSpy = jasmine.createSpyObj('CharacterFormService', ['initializeForm'], {
            unavailableAvatars: signal([]),
            lifePoints: dummyPointsValue,
            speedPoints: dummyPointsValue,
            attackPoints: dummyPointsValue,
            defensePoints: dummyPointsValue,
            attackDiceType: dummyDiceType,
            defenseDiceType: dummyDiceType,
        },
        );

        characterFormServiceSpy.characterForm = new FormGroup({
            playerName: new FormControl<string>('', { nonNullable: true }),
            avatar: new FormControl<Avatar | null>(null),
            bonusType: new FormControl<BonusType | null>(null),
            diceType: new FormControl<DiceSelectionType | null>(null),
        });

        await TestBed.configureTestingModule({
            imports: [CharacterFormComponent, MockAvatarSelectorComponent, MockCharacterInfoPanelComponent, MockCharacterModifierPanelComponent],
            providers: [
                { provide: CharacterFormService, useValue: characterFormServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CharacterFormComponent);
        component = fixture.componentInstance;

        fixture.detectChanges();
    });

    it('should initialize the form on ngOnInit', () => {
        expect(characterFormServiceSpy.initializeForm).toHaveBeenCalled();
    });

    it('should not emit submitForm if the form is invalid', () => {
        spyOn(component.submitForm, 'emit');
        characterFormServiceSpy.characterForm.setErrors({ invalid: true });
        component.onFormSubmitted();
        expect(component.submitForm.emit).not.toHaveBeenCalled();
    });

    it('should emit submitForm with correct data when form is valid', () => {
        spyOn(component.submitForm, 'emit');

        const testPlayerName = 'TestPlayer';
        const testAvatar = Avatar.Avatar1;

        characterFormServiceSpy.characterForm.patchValue({
            playerName: testPlayerName,
            avatar: testAvatar,
            bonusType: BonusType.Life,
            diceType: DiceSelectionType.D4AttackAndD6Defense,
        });;

        component.onFormSubmitted();

        const expectedData: CharacterFormData = {
            name: testPlayerName,
            avatar: testAvatar,
            initialHealth: dummyPointsValue,
            rapidityPoints: dummyPointsValue,
            attackPoints: dummyPointsValue,
            defensePoints: dummyPointsValue,
            attackBonusDiceType: dummyDiceType,
            defenseBonusDiceType: dummyDiceType,
        };
        expect(component.submitForm.emit).toHaveBeenCalledWith(expectedData);
    });
});
