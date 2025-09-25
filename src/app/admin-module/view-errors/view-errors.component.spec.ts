import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewErrorsComponent } from './view-errors.component';

describe('AdminReportsComponent', () => {
  let component: ViewErrorsComponent;
  let fixture: ComponentFixture<ViewErrorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ViewErrorsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ViewErrorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
