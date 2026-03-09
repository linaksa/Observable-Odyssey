/**
 * Stratégie de test – ToastComponent
 *
 * Approche : test de création minimal avec Angular TestBed et ComponentFixture.
 * Vérifie que le composant standalone est compilé et instancié sans erreur
 * par le module de test. Aucune interaction utilisateur n'est testée ici
 * car la logique de notification est délégée à ToastService.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToastComponent } from './toast.component';

describe('ToastComponent', () => {
    let component: ToastComponent;
    let fixture: ComponentFixture<ToastComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ToastComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ToastComponent);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
