import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Palpites } from './palpites';

describe('Palpites', () => {
  let component: Palpites;
  let fixture: ComponentFixture<Palpites>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Palpites],
    }).compileComponents();

    fixture = TestBed.createComponent(Palpites);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
