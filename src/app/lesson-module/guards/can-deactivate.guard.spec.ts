import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { canDeactivateResource } from './can-deactivate.guard';

describe('canDeactivateGuard', () => {
//  const executeGuard: CanActivateFn = (...guardParameters) => 
  //    TestBed.runInInjectionContext(() => canDeactivateResource(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });
  

  it('should be created', () => {
  //  expect(executeGuard).toBeTruthy();
  });
});
