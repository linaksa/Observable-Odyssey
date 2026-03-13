import { Component, Input } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { CharacterInfoPanelComponent } from './character-info-panel.component';

@Component({
    selector: 'app-player-name-input',
    standalone: true,
    template: '',
})
class MockPlayerNameInputComponent {
    @Input() form: FormGroup;
}

@Component({
    selector: 'app-character-attributes-grid',
    template: '',
    standalone: true,
    inputs: ['form'],
})
class MockCharacterAttributesGridComponent {}

@Component({
    selector: 'app-attribute-descriptions',
    template: '',
    standalone: true,
})
class MockAttributeDescriptionsComponent {}


describe('CharacterInfoPanelComponent', () => {
    let component: CharacterInfoPanelComponent;
    let fixture: ComponentFixture<CharacterInfoPanelComponent>;

    beforeEach(async () => {
        const overrideInfo: MetadataOverride<Component> = {
            set: { imports: [MockPlayerNameInputComponent, MockCharacterAttributesGridComponent, MockAttributeDescriptionsComponent] },
        };
        TestBed.overrideComponent(CharacterInfoPanelComponent, overrideInfo);

        await TestBed.configureTestingModule({
            imports: [CharacterInfoPanelComponent, MockPlayerNameInputComponent, MockCharacterAttributesGridComponent,
                MockAttributeDescriptionsComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(CharacterInfoPanelComponent);
        component = fixture.componentInstance;

        fixture.detectChanges();
    });

    it('should create', () => {
        // Nominal case
        // The component implements no logic. We only validate that it can be created without errors.

        expect(component).toBeTruthy();
    });
});
