import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameTableComponent } from './game-table.component';

describe('GameTableComponent', () => {
    let component: GameTableComponent;
    let fixture: ComponentFixture<GameTableComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameTableComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameTableComponent);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
