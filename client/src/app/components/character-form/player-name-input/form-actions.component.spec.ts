import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { PlayerNameInputComponent } from './player-name-input.component';

describe('PlayerNameInputComponent', () => {
    let component: PlayerNameInputComponent;
    let fixture: ComponentFixture<PlayerNameInputComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PlayerNameInputComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerNameInputComponent);
        component = fixture.componentInstance;

        component.form = new FormGroup({
            playerName: new FormControl<string>('', { nonNullable: true }),
        });

        fixture.detectChanges();
    });

    it('should create', () => {
        // Nominal case
        // The component has no logic. We simply verify that it is created without errors
        expect(component).toBeTruthy();
    });
});
