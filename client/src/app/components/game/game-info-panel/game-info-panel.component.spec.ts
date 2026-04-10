import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameInfoPanelComponent } from './game-info-panel.component';

@Component({
    selector: 'app-game-player-list',
    template: '<div data-testid="player-list"></div>',
})
class StubGamePlayerListComponent {}

@Component({
    selector: 'app-chat-panel',
    template: '<div data-testid="chat-panel"></div>',
})
class StubChatPanelComponent {}

@Component({
    selector: 'app-journal',
    template: '<div data-testid="journal-panel"></div>',
})
class StubJournalComponent {}

describe('GameInfoPanelComponent', () => {
    let fixture: ComponentFixture<GameInfoPanelComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameInfoPanelComponent],
        })
            .overrideComponent(GameInfoPanelComponent, {
                set: {
                    imports: [StubGamePlayerListComponent, StubChatPanelComponent, StubJournalComponent],
                },
            })
            .compileComponents();

        fixture = TestBed.createComponent(GameInfoPanelComponent);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('should keep the player list capped at half height and give the lower panel more space', () => {
        const host = fixture.nativeElement as HTMLElement;
        expect(host.classList.contains('min-h-0')).toBeTrue();
        expect(host.classList.contains('min-w-0')).toBeTrue();
        const playerListShell = host.querySelector('[data-testid="player-list-shell"]') as HTMLElement | null;
        const infoPanelShell = host.querySelector('[data-testid="info-panel-shell"]') as HTMLElement | null;

        expect(playerListShell).toBeTruthy();
        expect(playerListShell?.classList.contains('flex-initial')).toBeTrue();
        expect(playerListShell?.classList.contains('max-h-[50%]')).toBeTrue();
        expect(playerListShell?.classList.contains('overflow-hidden')).toBeTrue();
        expect(infoPanelShell).toBeTruthy();
        expect(infoPanelShell?.classList.contains('flex-1')).toBeTrue();
    });

    it('should show chat by default and switch to journal tab', () => {
        const host = fixture.nativeElement as HTMLElement;
        const tabButtons = host.querySelectorAll('button');

        expect(host.querySelector('[data-testid="chat-panel"]')).toBeTruthy();
        expect(host.querySelector('[data-testid="journal-panel"]')).toBeNull();

        (tabButtons[1] as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(host.querySelector('[data-testid="chat-panel"]')).toBeNull();
        expect(host.querySelector('[data-testid="journal-panel"]')).toBeTruthy();
    });
});
