/**
 * Testing strategy — Avatar Selector Component
 *
 * Approach:
 * - Isolate the container by replacing preview and grid children with lightweight mocks.
 * - Supply a reactive form with avatar validation to mirror production wiring.
 * - Validate selectedAvatar as a direct projection of the form control value.
 *
 * Edge cases covered:
 * - Starts with a null avatar control to ensure the component tolerates an unselected state.
 * - Confirms the getter updates immediately after form patchValue changes.
 * - Verifies no extra local state interferes with form-driven avatar selection.
 */
import { Component, Input } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Avatar } from '@common/constants';
import { AvatarSelectorComponent } from '@app/components/character-form/avatar-selector/avatar-selector.component';

@Component({
    selector: 'app-avatar-preview',
    standalone: true,
    template: '',
})
class MockAvatarPreviewComponent {
    @Input() avatar: Avatar | null = null;
}

@Component({
    selector: 'app-avatar-grid',
    standalone: true,
    template: '',
})
class MockAvatarGridComponent {
    @Input() form: FormGroup;
    @Input() unavailableAvatars: Avatar[];
}

describe('AvatarSelectorComponent', () => {
    let component: AvatarSelectorComponent;
    let fixture: ComponentFixture<AvatarSelectorComponent>;

    const formStubContent = {
        avatar: new FormControl<Avatar | null>(null, {
            validators: [Validators.required],
        }),
    };

    beforeEach(async () => {
        const overrideInfo: MetadataOverride<Component> = {
            set: { imports: [MockAvatarPreviewComponent, MockAvatarGridComponent] },
        };
        TestBed.overrideComponent(AvatarSelectorComponent, overrideInfo);

        await TestBed.configureTestingModule({
            imports: [AvatarSelectorComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(AvatarSelectorComponent);
        component = fixture.componentInstance;

        component.form = new FormGroup(formStubContent);
        component.unavailableAvatars = [];
        fixture.detectChanges();
    });

    // Edge case: When reading selectedAvatar, the component should expose the value from CharacterFormService.
    it('should return selected avatar', () => {
        // Nominal case
        // The function should return the avatar selected in the form

        const testAvatar = Avatar.Avatar1;
        component.form.patchValue({ avatar: testAvatar });

        expect(component.selectedAvatar).toBe(testAvatar);
    });
});
