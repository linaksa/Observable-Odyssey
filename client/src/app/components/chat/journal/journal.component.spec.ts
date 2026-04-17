/**
 * Testing strategy — Journal Component
 *
 * Approach:
 * - Validate journal scrolling behavior with a signal-driven game log stub.
 * - Drive render cycles with detectChanges to exercise afterEveryRender logic.
 *
 * Edge cases covered:
 * - No container should safely no-op on scroll handler.
 * - When not near the bottom, incoming logs should not force auto-scroll.
 * - Auto-scroll helper should safely no-op when the container is unavailable.
 */
import { ElementRef, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JOURNAL_DATE_FORMAT, JOURNAL_EMPTY_MESSAGE } from '@app/constants/journal';
import { GameLogService } from '@app/services/realtime/game-log.service';
import { IGameLogPayload } from '@common/socket-payloads';
import { JournalComponent } from './journal.component';

const EXPECTED_SCROLL_BOTTOM = 250;

describe('JournalComponent', () => {
    let component: JournalComponent;
    let fixture: ComponentFixture<JournalComponent>;
    let gameLogsSignal: ReturnType<typeof signal<IGameLogPayload[]>>;

    beforeEach(async () => {
        gameLogsSignal = signal<IGameLogPayload[]>([]);

        TestBed.overrideComponent(JournalComponent, { set: { template: '<div #journalScrollContainer></div>' } });

        await TestBed.configureTestingModule({
            imports: [JournalComponent],
            providers: [{ provide: GameLogService, useValue: { gameLogs: gameLogsSignal } }],
        }).compileComponents();

        fixture = TestBed.createComponent(JournalComponent);
        component = fixture.componentInstance;
    });

    it('should expose constant labels and service logs getter', () => {
        // Nominal case: component exposes constants and reactive logs as-is.
        fixture.detectChanges();

        const journal = component as unknown as {
            journalDateFormat: string;
            journalEmptyMessage: string;
            gameLogs: readonly IGameLogPayload[];
        };

        expect(journal.journalDateFormat).toBe(JOURNAL_DATE_FORMAT);
        expect(journal.journalEmptyMessage).toBe(JOURNAL_EMPTY_MESSAGE);
        expect(journal.gameLogs).toEqual([]);

        const firstLog = { message: 'Turn started', postedAt: new Date().toISOString() };
        gameLogsSignal.set([firstLog]);
        fixture.detectChanges();
        expect(journal.gameLogs).toEqual([firstLog]);
    });

    it('should scroll to bottom with nested animation frames when container exists', () => {
        const requestAnimationFrameSpy = spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
            callback(0);
            return 1;
        });

        const element = {
            scrollTop: 0,
            scrollHeight: EXPECTED_SCROLL_BOTTOM,
            clientHeight: 200,
        } as HTMLElement;
        (component as unknown as { journalScrollContainer: ElementRef<HTMLElement> }).journalScrollContainer = {
            nativeElement: element,
        } as ElementRef<HTMLElement>;

        // Nominal case: direct helper call performs an immediate snap plus RAF follow-ups.
        (component as unknown as { scrollJournalToBottom: () => void }).scrollJournalToBottom();

        // Edge case: render-synced log updates still keep the container snapped to bottom.
        gameLogsSignal.set([{ message: 'Combat started', postedAt: new Date().toISOString() }]);
        fixture.detectChanges();
        expect(requestAnimationFrameSpy).toHaveBeenCalled();
        expect(element.scrollTop).toBe(EXPECTED_SCROLL_BOTTOM);
    });

    it('should not auto-scroll when sticky mode is disabled before new logs', () => {
        const requestAnimationFrameSpy = spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
            callback(0);
            return 1;
        });

        fixture.detectChanges();

        (component as unknown as { shouldStickToBottom: boolean }).shouldStickToBottom = false;
        gameLogsSignal.set([{ message: 'New combat action', postedAt: new Date().toISOString() }]);
        fixture.detectChanges();

        expect(requestAnimationFrameSpy).not.toHaveBeenCalled();
    });

    it('should update stickiness on scroll based on distance from bottom', () => {
        const element = {
            scrollTop: 0,
            scrollHeight: 500,
            clientHeight: 100,
        } as HTMLElement;
        (component as unknown as { journalScrollContainer: ElementRef<HTMLElement> }).journalScrollContainer = {
            nativeElement: element,
        } as ElementRef<HTMLElement>;

        (component as unknown as { onScroll: () => void }).onScroll();
        expect((component as unknown as { shouldStickToBottom: boolean }).shouldStickToBottom).toBeFalse();

        element.scrollTop = 420;
        (component as unknown as { onScroll: () => void }).onScroll();
        expect((component as unknown as { shouldStickToBottom: boolean }).shouldStickToBottom).toBeTrue();
    });

    it('should avoid auto-scroll when user is far from bottom', () => {
        const element = {
            scrollTop: 0,
            scrollHeight: 400,
            clientHeight: 100,
        } as HTMLElement;
        (component as unknown as { journalScrollContainer: ElementRef<HTMLElement> }).journalScrollContainer = {
            nativeElement: element,
        } as ElementRef<HTMLElement>;

        (component as unknown as { onScroll: () => void }).onScroll();

        gameLogsSignal.set([{ message: 'Combat log', postedAt: new Date().toISOString() }]);
        fixture.detectChanges();

        expect(element.scrollTop).toBe(0);
    });

    it('should safely ignore onScroll when container does not exist', () => {
        (component as unknown as { journalScrollContainer?: ElementRef<HTMLElement> }).journalScrollContainer = undefined;

        expect(() => (component as unknown as { onScroll: () => void }).onScroll()).not.toThrow();
    });

    it('should safely ignore scrollJournalToBottom when container does not exist', () => {
        // Edge case: missing ViewChild container keeps helper side-effect free.
        const requestAnimationFrameSpy = spyOn(window, 'requestAnimationFrame');
        (component as unknown as { journalScrollContainer?: ElementRef<HTMLElement> }).journalScrollContainer = undefined;

        expect(() => (component as unknown as { scrollJournalToBottom: () => void }).scrollJournalToBottom()).not.toThrow();
        expect(requestAnimationFrameSpy).not.toHaveBeenCalled();
    });

    it('should safely no-op render sync when container does not exist', () => {
        // Edge case: log updates should not throw when afterEveryRender triggers without a container.
        (component as unknown as { journalScrollContainer?: ElementRef<HTMLElement> }).journalScrollContainer = undefined;
        fixture.detectChanges();

        expect(() => {
            gameLogsSignal.set([{ message: 'Event without container', postedAt: new Date().toISOString() }]);
            fixture.detectChanges();
        }).not.toThrow();
    });
});
