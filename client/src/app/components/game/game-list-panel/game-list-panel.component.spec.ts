import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameListPanelComponent } from './game-list-panel.component';

describe('GameListPanelComponent', () => {
    let component: GameListPanelComponent;
    let fixture: ComponentFixture<GameListPanelComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameListPanelComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameListPanelComponent);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
