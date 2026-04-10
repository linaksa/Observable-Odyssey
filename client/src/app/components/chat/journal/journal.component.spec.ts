import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameLogService } from '@app/services/realtime/game-log.service';
import { IGameLogPayload } from '@common/socket-payloads';
import { JournalComponent } from './journal.component';

describe('JournalComponent', () => {
    const mockScrollHeight = 240;
    let fixture: ComponentFixture<JournalComponent>;
    const logs = signal<IGameLogPayload[]>([]);
    const gameLogServiceMock = {
        connect: jasmine.createSpy('connect'),
        gameLogs: logs.asReadonly(),
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [JournalComponent],
            providers: [{ provide: GameLogService, useValue: gameLogServiceMock }],
        }).compileComponents();

        logs.set([]);
        gameLogServiceMock.connect.calls.reset();
        fixture = TestBed.createComponent(JournalComponent);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('should connect to game logs on init', () => {
        expect(gameLogServiceMock.connect).toHaveBeenCalled();
    });

    it('should display journal only content without chat tab buttons', () => {
        const host = fixture.nativeElement as HTMLElement;

        expect(host.querySelectorAll('button').length).toBe(0);
        expect(host.textContent).toContain('Journal de partie');
    });

    it('should show the empty journal message when there are no logs', () => {
        const host = fixture.nativeElement as HTMLElement;

        expect(host.textContent).toContain('Aucun evenement pour le moment.');
    });

    it('should render logs and keep scroll-to-bottom behavior', () => {
        const host = fixture.nativeElement as HTMLElement;
        const container = host.querySelector('[role="log"]') as HTMLElement;
        const component = fixture.componentInstance as unknown as { scrollJournalToBottom: () => void };

        Object.defineProperty(container, 'scrollHeight', { configurable: true, value: mockScrollHeight });
        Object.defineProperty(container, 'scrollTop', { configurable: true, writable: true, value: 0 });

        logs.set([{ message: 'Premier événement', postedAt: '2024-01-01T10:00:00Z' }]);
        fixture.detectChanges();
        component.scrollJournalToBottom();

        expect(host.textContent).toContain('Premier événement');
        expect(container.scrollTop).toBe(mockScrollHeight);
    });
});
