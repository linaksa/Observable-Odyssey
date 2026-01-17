import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateGameFormComponent } from './create-game-form.component';

describe('CreateGameFormComponent', () => {
    let component: CreateGameFormComponent;
    let fixture: ComponentFixture<CreateGameFormComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CreateGameFormComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(CreateGameFormComponent);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
