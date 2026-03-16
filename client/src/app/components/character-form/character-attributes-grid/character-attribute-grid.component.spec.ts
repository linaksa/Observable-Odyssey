import { Component, Input } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed } from '@angular/core/testing';
import { CharacterFormService } from '@app/services/character-form.service';
import { CharacterAttributesGridComponent } from './character-attributes-grid.component';

@Component({
    selector: 'app-attribute-display',
    template: '',
    standalone: true,
})
class MockAttributeDisplayComponent {
    @Input() name: string;
    @Input() value: number | string;
    @Input() bgColor: string;
}

describe('CharacterAttributesGridComponent', () => {
    let component: CharacterAttributesGridComponent;
    let fixture: ComponentFixture<CharacterAttributesGridComponent>;

    let characterFormServiceSpy: jasmine.SpyObj<CharacterFormService>;

    const dummyPointsValue = 5;

    beforeEach(async () => {
        const overrideInfo: MetadataOverride<Component> = {
            set: { imports: [MockAttributeDisplayComponent] },
        };
        TestBed.overrideComponent(CharacterAttributesGridComponent, overrideInfo);

        characterFormServiceSpy = jasmine.createSpyObj('CharacterFormService', [], {
            lifePoint: dummyPointsValue,
            speedPoints: dummyPointsValue,
            attackPoints: dummyPointsValue,
            defensePoints: dummyPointsValue,
        });

        await TestBed.configureTestingModule({
            imports: [CharacterAttributesGridComponent],
            providers: [{ provide: CharacterFormService, useValue: characterFormServiceSpy }],
        }).compileComponents();

        fixture = TestBed.createComponent(CharacterAttributesGridComponent);
        component = fixture.componentInstance;

        fixture.detectChanges();
    });

    it('should create component successfully', () => {
        // Nominal case
        // The component contains no logic, so we only need to verify that it is created correctly

        expect(component).toBeTruthy();
    });
});
