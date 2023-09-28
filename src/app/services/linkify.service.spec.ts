import { TestBed } from '@angular/core/testing';

import { LinkifyService } from './linkify.service';

describe('LinkifyService', () => {
  let service: LinkifyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LinkifyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
