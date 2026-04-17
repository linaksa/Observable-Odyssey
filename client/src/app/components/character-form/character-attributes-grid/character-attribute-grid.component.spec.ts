/**
 * Testing strategy — Character Attribute Grid Component
 *
 * Approach:
 * - Replace nested attribute cards with a mock component to isolate container setup.
 * - Provide CharacterFormService as a spy object with fixed points values.
 * - Keep this suite as a smoke test that validates TestBed composition.
 *
 * Edge cases covered:
 * - Confirms the component instantiates with overridden imports and mocked service data.
 * - Verifies no runtime dependency errors occur when child rendering is stubbed.
 * - Protects against regressions in standalone metadata wiring.
 */
import { Component, Input } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed } from '@angular/core/testing';
import { CharacterFormService } from '@app/services/forms/character-form.service';
import { CharacterAttributesGridComponent } from '@app/components/character-form/character-attributes-grid/character-attributes-grid.component';

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

    // Edge case: Minimal setup path with isolated TestBed configuration. Verifies instantiation succeeds without missing dependencies.
    it('should create component successfully', () => {
        // Nominal case
        // The component contains no logic, so we only need to verify that it is created correctly

        expect(component).toBeTruthy();
    });
});
