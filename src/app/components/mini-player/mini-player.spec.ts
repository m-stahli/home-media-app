import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiniPlayer } from './mini-player';

describe('MiniPlayer', () => {
  let component: MiniPlayer;
  let fixture: ComponentFixture<MiniPlayer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiniPlayer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MiniPlayer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
