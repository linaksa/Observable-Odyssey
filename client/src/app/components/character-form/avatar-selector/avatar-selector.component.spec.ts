import { Component, Input } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Avatar } from '@common/constants';
import { AvatarSelectorComponent } from './avatar-selector.component';

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

    it('should return selected avatar', () => {
        // Nominal case
        // The function should return the avatar selected in the form

        const testAvatar = Avatar.Avatar1;
        component.form.patchValue({ avatar: testAvatar });

        expect(component.selectedAvatar).toBe(testAvatar);
    });
});