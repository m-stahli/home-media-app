import { TestBed } from '@angular/core/testing';

import { Streaming } from './streaming';

describe('Streaming', () => {
  let service: Streaming;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Streaming);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
