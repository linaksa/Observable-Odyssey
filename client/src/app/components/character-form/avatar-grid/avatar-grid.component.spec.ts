import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Avatar } from '@common/constants';
import { AvatarGridComponent } from './avatar-grid.component';


describe('AvatarGridComponent', () => {
    let component: AvatarGridComponent;
    let fixture: ComponentFixture<AvatarGridComponent>;

    const formStubContent = {
        avatar: new FormControl<Avatar | null>(null, {
            validators: [Validators.required],
        }),
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AvatarGridComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(AvatarGridComponent);
        component = fixture.componentInstance;

        component.form = new FormGroup(formStubContent);
        component.unavailableAvatars = [];
        fixture.detectChanges();
    });

    it('should select avatar when available', () => {
        // Nominal case
        // The user selects an avatar
        const avatar = Avatar.Avatar1;

        component.selectAvatar(avatar);

        expect(component.form.controls.avatar.value).toBe(avatar);
    });

    it('should not select avatar when it is unavailable', () => {
        // Edge case
        // The user selects an avatar that is in the list of unavailable avatars

        const selectedAvatar = Avatar.Avatar2;
        component.form.patchValue({ avatar: selectedAvatar }); // Patch the form value to simulate a previous selection

        const avatar = Avatar.Avatar1;
        component.unavailableAvatars = [avatar];

        component.selectAvatar(avatar);

        expect(component.form.controls.avatar.value).toBe(selectedAvatar);
    });

    it('should return selected avatar from getter', () => {
        // Nominal case
        // The user selects an avatar and we verify that the getter returns the correct avatar

        const avatar = Avatar.Avatar2;
        component.form.patchValue({ avatar });
        expect(component.selectedAvatar).toBe(avatar);
    });
});