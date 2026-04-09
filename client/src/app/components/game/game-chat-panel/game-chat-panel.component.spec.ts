import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameChatPanelComponent } from './game-chat-panel.component';

describe('GameChatPanelComponent', () => {
    let component: GameChatPanelComponent;
    let fixture: ComponentFixture<GameChatPanelComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameChatPanelComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameChatPanelComponent);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
