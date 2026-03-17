/**
 * Stratégie de test – ToastService
 *
 * Approche : test de création minimal avec Angular TestBed.
 * Vérifie que le service est instancié correctement par l'injecteur Angular
 * sans dépendances supplémentaires à configurer.
 */
import { TestBed } from '@angular/core/testing';

import { ToastService } from './toast.service';

describe('ToastService', () => {
    let service: ToastService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ToastService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
