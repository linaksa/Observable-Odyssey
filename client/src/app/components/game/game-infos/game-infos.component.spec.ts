import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameInfosComponent } from './game-infos.component';

describe('GameInfosComponent', () => {
    let component: GameInfosComponent;
    let fixture: ComponentFixture<GameInfosComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameInfosComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameInfosComponent);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
