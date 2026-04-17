/**
 * Testing strategy — Message Zone Component
 *
 * Approach:
 * - Override the template to avoid rendering complex child components.
 * - Validate tab state transitions.
 *
 * Edge cases covered:
 * - Switching away from the default tab updates the active signal value.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JOURNAL_DEFAULT_TAB, JournalTab } from '@app/constants/journal';
import { MessageZoneComponent } from '@app/components/common/message-zone/message-zone.component';

describe('MessageZoneComponent', () => {
    let fixture: ComponentFixture<MessageZoneComponent>;
    let component: MessageZoneComponent;

    beforeEach(async () => {
        TestBed.overrideComponent(MessageZoneComponent, { set: { template: '' } });

        await TestBed.configureTestingModule({
            imports: [MessageZoneComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(MessageZoneComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('keeps the default tab and updates active tab when requested', () => {
        // Nominal case: component starts with default journal tab.
        expect(component['activeTab']()).toBe(JOURNAL_DEFAULT_TAB);

        // Edge case: changing tab updates the signal.
        component['setActiveTab'](JournalTab.Journal);
        expect(component['activeTab']()).toBe(JournalTab.Journal);
    });
});
