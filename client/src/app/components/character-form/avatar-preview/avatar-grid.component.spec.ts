import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AVATAR_IMAGE_PATH_MODEL } from '@app/constants/character-form';
import { Avatar } from '@common/constants';
import { AvatarPreviewComponent } from './avatar-preview.component';

describe('AvatarPreviewComponent', () => {
    let component: AvatarPreviewComponent;
    let fixture: ComponentFixture<AvatarPreviewComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AvatarPreviewComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(AvatarPreviewComponent);
        component = fixture.componentInstance;

        component.avatar = null;
        fixture.detectChanges();
    });

    it('should have no image when no avatar is provided', () => {
        // Edge case
        // No avatar is selected; the template should render without errors

        component.avatar = null;
        fixture.detectChanges();

        expect(component).toBeTruthy();
    });

    it('should display correct image when avatar is provided', () => {
        // Nominal case
        // The selected avatar image should be displayed

        const testAvatar = Avatar.Avatar1;
        expect(component.getImageForAvatar(testAvatar)).toBe(AVATAR_IMAGE_PATH_MODEL.replace('{}', testAvatar));
    });
});
