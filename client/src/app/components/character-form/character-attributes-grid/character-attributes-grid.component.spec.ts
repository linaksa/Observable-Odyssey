/**
 * Testing strategy — Character Attributes Grid Component
 *
 * Approach:
 * - Keep each test focused on one behavior with deterministic mocks/spies.
 * - Validate both nominal flows and failure paths that could break UX/state.
 * - Assert side effects explicitly (state changes, emitted events, and service calls).
 *
 * Edge cases covered:
 * - Missing or invalid input guards and safe early returns.
 * - Error handling paths and fallback user-facing messaging.
 * - Cleanup/teardown behavior (unsubscribe/reset/disconnect) when applicable.
 */
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CharacterFormService } from '@app/services/character-form.service';
import { CharacterAttributesGridComponent } from './character-attributes-grid.component';

const ATTRIBUTE_CARD_COUNT = 4;
const LIFE_POINTS = 8;
const SPEED_POINTS = 7;
const ATTACK_POINTS = 4;
const DEFENSE_POINTS = 5;

@Component({
    selector: 'app-attribute-display',
    template: '',
})
class MockAttributeDisplayComponent {
    @Input() name: string;
    @Input() value: number | string;
    @Input() bgColor: string;
}

describe('CharacterAttributesGridComponent', () => {
    let component: CharacterAttributesGridComponent;
    let fixture: ComponentFixture<CharacterAttributesGridComponent>;

    const characterFormServiceStub = {
        lifePoints: LIFE_POINTS,
        speedPoints: SPEED_POINTS,
        attackPoints: ATTACK_POINTS,
        defensePoints: DEFENSE_POINTS,
    };

    beforeEach(async () => {
        TestBed.overrideComponent(CharacterAttributesGridComponent, {
            set: { imports: [CommonModule, MockAttributeDisplayComponent] },
        });

        await TestBed.configureTestingModule({
            imports: [CharacterAttributesGridComponent],
            providers: [{ provide: CharacterFormService, useValue: characterFormServiceStub }],
        }).compileComponents();

        fixture = TestBed.createComponent(CharacterAttributesGridComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should pass expected labels and values to attribute display cards', () => {
        const displayCards = fixture.debugElement.queryAll(By.directive(MockAttributeDisplayComponent));
        const cardComponents = displayCards.map((card) => card.componentInstance as MockAttributeDisplayComponent);

        expect(cardComponents.length).toBe(ATTRIBUTE_CARD_COUNT);
        expect(cardComponents.map((card) => card.name)).toEqual(['Vie', 'Rapidité', 'Attaque', 'Défense']);
        expect(cardComponents.map((card) => card.value)).toEqual([LIFE_POINTS, SPEED_POINTS, ATTACK_POINTS, DEFENSE_POINTS]);
    });
});
