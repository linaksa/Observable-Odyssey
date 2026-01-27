import { TestBed } from '@angular/core/testing';

import { GameEditFormService } from './game-edit-form.service';

describe('GameEditFormService', () => {
  let service: GameEditFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameEditFormService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
