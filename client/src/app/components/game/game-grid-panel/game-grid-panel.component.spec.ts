import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameGridPanelComponent } from './game-grid-panel.component';

describe('GameGridPanelComponent', () => {
    let component: GameGridPanelComponent;
    let fixture: ComponentFixture<GameGridPanelComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameGridPanelComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameGridPanelComponent);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
