import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportErrorComponent } from './report-error.component';
import { ErrorService } from '../../services/error.service';

describe('ReportErrorComponent', () => {
  let component: ReportErrorComponent;
  let fixture: ComponentFixture<ReportErrorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReportErrorComponent],
      imports: [
        ReactiveFormsModule
      ],
      providers: [
        ErrorService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReportErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
