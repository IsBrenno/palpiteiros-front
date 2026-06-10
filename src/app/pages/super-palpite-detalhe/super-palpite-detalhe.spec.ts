import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuperPalpiteDetalhe } from './super-palpite-detalhe';

describe('SuperPalpiteDetalhe', () => {
  let component: SuperPalpiteDetalhe;
  let fixture: ComponentFixture<SuperPalpiteDetalhe>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperPalpiteDetalhe],
    }).compileComponents();

    fixture = TestBed.createComponent(SuperPalpiteDetalhe);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
